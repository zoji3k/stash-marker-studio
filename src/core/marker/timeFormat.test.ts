import { formatSecondsForInput, parseTimeString } from "./timeFormat";

describe("formatSecondsForInput", () => {
  it("formats zero seconds", () => {
    expect(formatSecondsForInput(0)).toBe("0:00.000");
  });

  it("formats seconds under one minute", () => {
    expect(formatSecondsForInput(12)).toBe("0:12.000");
  });

  it("formats seconds with milliseconds", () => {
    expect(formatSecondsForInput(12.5)).toBe("0:12.500");
  });

  it("formats exactly one minute", () => {
    expect(formatSecondsForInput(60)).toBe("1:00.000");
  });

  it("formats minutes and seconds", () => {
    expect(formatSecondsForInput(64.5)).toBe("1:04.500");
  });

  it("does not zero-pad minutes", () => {
    expect(formatSecondsForInput(125)).toBe("2:05.000");
  });

  it("handles large minute values (no hours component)", () => {
    expect(formatSecondsForInput(3900)).toBe("65:00.000");
  });

  it("rounds to 3 decimal places", () => {
    expect(formatSecondsForInput(1.0005)).toBe("0:01.001");
  });
});

describe("parseTimeString", () => {
  it("parses M:SS.mmm", () => {
    expect(parseTimeString("0:12.000")).toBe(12);
  });

  it("parses M:SS.mmm with fractional seconds", () => {
    expect(parseTimeString("1:04.500")).toBeCloseTo(64.5);
  });

  it("parses MM:SS.mmm (zero-padded minutes)", () => {
    expect(parseTimeString("01:04.500")).toBeCloseTo(64.5);
  });

  it("parses large minute values", () => {
    expect(parseTimeString("65:00.000")).toBe(3900);
  });

  it("parses M:SS without milliseconds", () => {
    expect(parseTimeString("1:30")).toBe(90);
  });

  it("throws on invalid format", () => {
    expect(() => parseTimeString("abc")).toThrow();
    expect(() => parseTimeString("1:99.000")).toThrow();
    expect(() => parseTimeString("")).toThrow();
  });

  it("throws when seconds >= 60", () => {
    expect(() => parseTimeString("0:60.000")).toThrow();
  });
});
