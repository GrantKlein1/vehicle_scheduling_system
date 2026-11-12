import { Op } from "sequelize";
import db from "../models/index.js";
import { ROLES } from "../authorization/roles.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function areaJson(area) {
  const row = area.toJSON ? area.toJSON() : area;
  return {
    id: row.id,
    name: row.name,
    logo: row.logo ?? null,
    notificationEmail: row.notificationEmail ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function validateAreaPayload(body, isUpdate = false) {
  const rawName = body.name !== undefined ? String(body.name).trim() : undefined;
  const rawEmail = body.notificationEmail !== undefined ? String(body.notificationEmail).trim() : undefined;
  const rawLogo = body.logo !== undefined ? (body.logo !== null ? String(body.logo).trim() : null) : undefined;

  if (rawName !== undefined) {
    if (!rawName) {
      return { valid: false, message: "Area name cannot be empty." };
    }
    if (rawName.length > 50) {
      return { valid: false, message: "Area name cannot exceed 50 characters." };
    }
  } else if (!isUpdate) {
    return { valid: false, message: "Area name cannot be empty." };
  }

  if (rawEmail !== undefined) {
    if (!rawEmail) {
      return { valid: false, message: "Notification email cannot be empty." };
    }
    if (rawEmail.length > 255) {
      return { valid: false, message: "Notification email cannot exceed 255 characters." };
    }
    if (!EMAIL_REGEX.test(rawEmail)) {
      return { valid: false, message: "Notification email must be a valid email address." };
    }
  } else if (!isUpdate) {
    return { valid: false, message: "Notification email cannot be empty." };
  }

  if (rawLogo !== undefined && rawLogo !== null) {
    if (rawLogo.length > 255) {
      return { valid: false, message: "Logo cannot exceed 255 characters." };
    }
  }

  return {
    valid: true,
    value: {
      ...(rawName !== undefined ? { name: rawName } : {}),
      ...(rawEmail !== undefined ? { notificationEmail: rawEmail } : {}),
      ...(rawLogo !== undefined ? { logo: rawLogo === "" ? null : rawLogo } : {}),
    },
  };
}

export async function listAreas(req, res) {
  try {
    const areas = await db.area.findAll({
      order: [
        ["name", "ASC"],
        ["id", "ASC"],
      ],
    });
    return res.status(200).json(areas.map(areaJson));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function getArea(req, res) {
  try {
    const areaId = Number(req.params.areaId);
    const area = await db.area.findByPk(areaId);
    if (!area) {
      return res.status(404).json({ message: `Area with id=${req.params.areaId} not found.` });
    }
    return res.status(200).json(areaJson(area));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function createArea(req, res) {
  try {
    const validation = validateAreaPayload(req.body, false);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const existing = await db.area.findOne({
      where: db.Sequelize.where(
        db.Sequelize.fn("lower", db.Sequelize.col("name")),
        validation.value.name.toLowerCase()
      ),
    });

    if (existing) {
      return res.status(400).json({ message: "Area name already exists." });
    }

    const area = await db.area.create(validation.value);
    return res.status(201).json(areaJson(area));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function updateArea(req, res) {
  try {
    const areaId = Number(req.params.areaId);
    const area = await db.area.findByPk(areaId);
    if (!area) {
      return res.status(404).json({ message: `Area with id=${req.params.areaId} not found.` });
    }

    const validation = validateAreaPayload(req.body, true);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    if (validation.value.name) {
      const duplicate = await db.area.findOne({
        where: {
          [Op.and]: [
            db.Sequelize.where(
              db.Sequelize.fn("lower", db.Sequelize.col("name")),
              validation.value.name.toLowerCase()
            ),
            { id: { [Op.ne]: areaId } },
          ],
        },
      });
      if (duplicate) {
        return res.status(400).json({ message: "Area name already exists." });
      }
    }

    await area.update(validation.value);
    return res.status(200).json({ message: "Area was updated successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function deleteArea(req, res) {
  try {
    const areaId = Number(req.params.areaId);
    const area = await db.area.findByPk(areaId);
    if (!area) {
      return res.status(404).json({ message: `Area with id=${req.params.areaId} not found.` });
    }

    // Check if vehicles are assigned to this area name
    const vehicleCount = await db.vehicle.count({
      where: { areaAssigned: area.name },
    });
    if (vehicleCount > 0) {
      return res
        .status(400)
        .json({ message: "Cannot delete area currently assigned to vehicles or area admins." });
    }

    // Check if area admins are assigned to this area
    const adminCount = await db.user.count({
      where: { areaId: area.id, role: ROLES.AREA_ADMIN },
    });
    if (adminCount > 0) {
      return res
        .status(400)
        .json({ message: "Cannot delete area currently assigned to vehicles or area admins." });
    }

    await area.destroy();
    return res.status(200).json({ message: "Area was deleted successfully!" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function listAreaAdmins(req, res) {
  try {
    const areaId = Number(req.params.areaId);
    const area = await db.area.findByPk(areaId);
    if (!area) {
      return res.status(404).json({ message: `Area with id=${req.params.areaId} not found.` });
    }

    const admins = await db.user.findAll({
      where: { areaId, role: ROLES.AREA_ADMIN },
      attributes: ["id", "fName", "lName", "email", "role", "areaId"],
      order: [
        ["lName", "ASC"],
        ["fName", "ASC"],
      ],
    });

    return res.status(200).json(admins);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function assignAreaAdmin(req, res) {
  try {
    const areaId = Number(req.params.areaId);
    const area = await db.area.findByPk(areaId);
    if (!area) {
      return res.status(404).json({ message: `Area with id=${req.params.areaId} not found.` });
    }

    const { userId, email } = req.body;
    let user;
    if (userId !== undefined) {
      user = await db.user.findByPk(Number(userId));
    } else if (email) {
      user = await db.user.findOne({
        where: { email: String(email).trim().toLowerCase() },
      });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === ROLES.AREA_ADMIN && user.areaId === areaId) {
      return res.status(400).json({ message: "User is already an area admin for this area." });
    }

    await user.update({
      role: ROLES.AREA_ADMIN,
      areaId: area.id,
    });

    return res.status(200).json({
      message: "User assigned as area admin successfully.",
      user: {
        id: user.id,
        fName: user.fName,
        lName: user.lName,
        email: user.email,
        role: user.role,
        areaId: user.areaId,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export async function removeAreaAdmin(req, res) {
  try {
    const areaId = Number(req.params.areaId);
    const userId = Number(req.params.userId);

    const user = await db.user.findOne({
      where: { id: userId, areaId, role: ROLES.AREA_ADMIN },
    });

    if (!user) {
      return res.status(404).json({ message: "Area admin assignment not found." });
    }

    await user.update({
      role: ROLES.REQUESTOR,
      areaId: null,
    });

    return res.status(200).json({ message: "Area admin removed successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

