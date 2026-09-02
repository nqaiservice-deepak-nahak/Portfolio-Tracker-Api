const messageFactory = (message: Messages, msgParams?: string[]): string => {
  let newMsg: string = message as unknown as string;
  if (msgParams && msgParams.length > 0) {
    msgParams.forEach((val, key) => {
      newMsg = newMsg.split(`ARG${key}`).join(val?.toString());
    });
  }
  return newMsg;
};

enum Messages {
  /* Success messages : Start with S */
  S1 = 'Portfolio Tracker API is listening on ARG0.',
  S2 = 'Connected to MongoDB server!',
  S3 = 'Success.',
  S4 = 'User registered successfully.',
  S5 = 'Login successful.',
  S6 = 'Session refreshed successfully.',
  S7 = 'User logged out successfully.',
  S8 = 'User profile fetched successfully.',
  S9 = 'Mutual fund created successfully.',
  S10 = 'Mutual funds fetched successfully.',
  S11 = 'Mutual fund fetched successfully.',
  S12 = 'Mutual fund updated successfully.',
  S13 = 'Mutual fund archived successfully.',
  S14 = 'SIP entry created successfully.',
  S15 = 'SIP entries fetched successfully.',
  S16 = 'Mutual fund projection fetched successfully.',
  S17 = 'Trade created successfully.',
  S18 = 'Trades fetched successfully.',
  S19 = 'Trade fetched successfully.',
  S20 = 'Trade updated successfully.',
  S21 = 'Trade archived successfully.',
  S22 = 'Trade sell recorded successfully.',
  S23 = 'Trade sells fetched successfully.',
  S24 = 'Dashboard summary fetched successfully.',
  S25 = 'Session ended successfully.',
  S26 = 'Microsoft registration completed successfully.',
  S27 = 'Microsoft login completed successfully.',

  /* Warning messages : Start with W */
  W1 = 'Please provide a valid ARG0!',
  W2 = 'ARG0 should not be empty!',
  W3 = 'ARG0 should be a numeric value!',
  W4 = 'ARG0 should not exceed more than ARG1 characters.',
  W5 = 'ARG0 not found.',
  W6 = 'This email is already registered. Please log in instead.',
  W7 = 'Invalid email or password.',
  W8 = 'User account is inactive.',
  W9 = 'Invalid or expired refresh token.',
  W10 = 'Microsoft login is not configured.',
  W11 = 'Invalid Microsoft redirect URI.',
  W12 = 'Microsoft authorization code exchange failed.',
  W13 = 'Invalid Microsoft login token.',
  W14 = 'Microsoft account id not found.',
  W15 = 'Microsoft account email not found.',
  W16 = 'Microsoft account already exists. Please login with Microsoft.',
  W17 = 'Email already exists. Please login with your existing account.',
  W18 = 'Microsoft account not registered. Please register with Microsoft first.',
  W19 = 'This account uses Microsoft login. Please continue with Microsoft.',
  W20 = 'User not found. Please create an account first.',
  W21 = 'Either sipAmount or lumpSumAmount must be greater than 0.',
  W22 = 'startDate cannot be in the future.',
  W23 = 'SIP entry already exists for this fund and month.',
  W24 = 'Quantity must be greater than 0.',
  W25 = 'Buy price must be greater than 0.',
  W26 = 'Invalid buy date.',
  W27 = 'Buy date cannot be in the future.',
  W28 = 'Invalid trade id.',
  W29 = 'Quantity cannot be less than already sold quantity.',
  W30 = 'Invalid sell date.',
  W31 = 'Sell date cannot be before buy date.',
  W32 = 'Archived trade cannot be sold.',
  W33 = 'Closed trade cannot be sold again.',
  W34 = 'Sell quantity must be greater than 0.',
  W35 = 'Sell price must be greater than 0.',
  W36 = 'Sell quantity cannot be greater than remaining quantity ARG0.',
  W37 = 'Buy date cannot be after an existing sell date.',
  W38 = 'Microsoft ID token was not returned.',
  W39 = 'Sell date cannot be in the future.',

  /* Error messages : Start with E */
  E1 = 'Application failed to start: ARG0',
  E2 = 'Something went wrong. Please try again later.',
  E3 = 'Unauthorized access.',
  E4 = 'MongoDB connection error: ARG0',
  E5 = 'MongoDB disconnected.',
}

export { messageFactory, Messages };
