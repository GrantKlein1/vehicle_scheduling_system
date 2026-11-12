/**
 * Recorded mail transport. Tests force a failure with failMailFor.
 * A real SMTP host is not required. The emails table is the record of each notice.
 */

let failPredicate = () => false;

export function resetMailTransport() {
  failPredicate = () => false;
}

export function failMailFor(predicate) {
  failPredicate = typeof predicate === "function" ? predicate : () => false;
}

export async function sendMail({ to }) {
  if (failPredicate(to)) {
    throw new Error("Mail transport failed");
  }
}
