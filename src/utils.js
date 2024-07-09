export function getInitials(fullName) {
  const nameParts = fullName.trim().split(" ");
  const initials = nameParts
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return initials;
}
