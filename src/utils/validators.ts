type ValidationResult = {
  valid: boolean;
  reason?: string | null;
};

export const validateUsername = (username: string): ValidationResult => {
  // Regular expression to match valid username pattern
  const usernameRegex = /^[A-Za-z0-9]+(_[A-Za-z0-9]+)?$/;
  const valid = usernameRegex.test(username);
  return {
    valid,
    reason:
      "Username should only contain alphbets, numbers and at most one userscore",
  };
};

export const validatePassword = (password: string): ValidationResult => {
  if (password.length < 6) {
    return {
      valid: false,
      reason: "Password should be greater that 6 characters",
    };
  }

  return {
    valid: true,
    reason: null,
  };
};
