type ValidationResult = {
  valid: boolean;
  reason?: string | null;
};

export const validateUsername = (username: string): ValidationResult => {
  // Regular expression to match valid username pattern
  const usernameRegex = /^[a-zA-Z0-9._]{3,15}$/;
  const valid = usernameRegex.test(username);
  return {
    valid,
  };
};

export const validatePassword = (password: string): ValidationResult => {
  const res: ValidationResult = {
    valid: true,
    reason: null,
  };

  if (password.length < 6) {
    return {
      valid: false,
      reason: "Password should be greater that 6 characters",
    };
  }

  return res;
};
