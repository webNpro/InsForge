export enum OnboardStep {
  INSTALL_NODEJS = 1,
  INSTALL_MCP = 2,
  TEST_CONNECTION = 3,
}

export const TOTAL_STEPS = Object.keys(OnboardStep).filter((key) => !isNaN(Number(key))).length;
