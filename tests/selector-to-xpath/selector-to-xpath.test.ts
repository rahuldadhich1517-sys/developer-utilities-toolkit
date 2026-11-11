import { describe, expect, it } from "vitest";
import {
  convertSelectorListToXPath,
  cssSelectorToXPath,
  escapeXPathString,
  getSupportedSelectorFeatures,
  validateCssSelector,
} from "../../src/selector-to-xpath/index.js";
import { ParsingError, UnsupportedError, ValidationError } from "../../src/shared/errors.js";

describe("selector-to-xpath utility", () => {
  it("escapes XPath string literals properly with quotes and concat", () => {
    expect(escapeXPathString("simple")).toBe("'simple'");
    expect(escapeXPathString("it's")).toBe('"it\'s"');
    expect(escapeXPathString('with "quotes"')).toBe('\'with "quotes"\'');
    expect(escapeXPathString('both\' and "')).toBe("concat('both', \"'\", ' and \"')");
  });

  it("converts tag, universal, ID, and class selectors", () => {
    expect(cssSelectorToXPath("div")).toBe("//div");
    expect(cssSelectorToXPath("*")).toBe("//*");
    expect(cssSelectorToXPath("#main")).toBe("//*[@id='main']");
    expect(cssSelectorToXPath(".container")).toBe("//*[contains(concat(' ', normalize-space(@class), ' '), ' container ')]");
    expect(cssSelectorToXPath("button.btn#submit")).toBe(
      "//button[contains(concat(' ', normalize-space(@class), ' '), ' btn ')][@id='submit']"
    );
  });

  it("converts attribute selectors (=, ^=, $=, *=, ~=, existence)", () => {
    expect(cssSelectorToXPath("[disabled]")).toBe("//*[@disabled]");
    expect(cssSelectorToXPath("input[type='text']")).toBe("//input[@type='text']");
    expect(cssSelectorToXPath("a[href^='https://']")).toBe("//a[starts-with(@href, 'https://')]");
    expect(cssSelectorToXPath("img[src$='.png']")).toBe(
      "//img[substring(@src, string-length(@src) - string-length('.png') + 1) = '.png']"
    );
    expect(cssSelectorToXPath("div[data-role*='admin']")).toBe("//div[contains(@data-role, 'admin')]");
    expect(cssSelectorToXPath("span[title~='hello']")).toBe(
      "//span[contains(concat(' ', normalize-space(@title), ' '), concat(' ', 'hello', ' '))]"
    );
  });

  it("converts combinators (descendant, child, adjacent, general sibling)", () => {
    expect(cssSelectorToXPath("div p")).toBe("//div//p");
    expect(cssSelectorToXPath("ul > li")).toBe("//ul/li");
    expect(cssSelectorToXPath("h1 + p")).toBe("//h1/following-sibling::*[1]/self::p");
    expect(cssSelectorToXPath("h1 ~ p")).toBe("//h1/following-sibling::p");
    expect(cssSelectorToXPath("nav > ul > li a", { relative: true })).toBe(".//nav/ul/li//a");
  });

  it("converts selector groups", () => {
    expect(cssSelectorToXPath("h1, h2, h3")).toBe("//h1 | //h2 | //h3");
    expect(convertSelectorListToXPath(["h1", "h2"])).toBe("//h1 | //h2");
  });

  it("converts pseudo-classes (:first-child, :last-child, :nth-child, :nth-of-type, :not, :empty)", () => {
    expect(cssSelectorToXPath("li:first-child")).toBe("//li[not(preceding-sibling::*)]");
    expect(cssSelectorToXPath("li:last-child")).toBe("//li[not(following-sibling::*)]");
    expect(cssSelectorToXPath("div:empty")).toBe("//div[not(node())]");
    expect(cssSelectorToXPath("li:nth-child(2)")).toBe("//li[count(preceding-sibling::*) = 1]");
    expect(cssSelectorToXPath("li:nth-child(2n+1)")).toBe("//li[(count(preceding-sibling::*) + 1) >= 1 and ((count(preceding-sibling::*) + 1) - 1) mod 2 = 0]");
    expect(cssSelectorToXPath("li:nth-child(-n+3)")).toBe("//li[(count(preceding-sibling::*) + 1) <= 3 and (3 - (count(preceding-sibling::*) + 1)) mod 1 = 0]");
    expect(cssSelectorToXPath("li:nth-child(0)")).toBe("//li[0 = 1]");
    expect(cssSelectorToXPath("tr:nth-child(odd)")).toBe("//tr[(count(preceding-sibling::*) + 1) mod 2 = 1]");
    expect(cssSelectorToXPath("tr:nth-child(even)")).toBe("//tr[(count(preceding-sibling::*) + 1) mod 2 = 0]");
    expect(cssSelectorToXPath("p:nth-of-type(3)")).toBe("//p[position() = 3]");
    expect(cssSelectorToXPath("p:nth-of-type(0)")).toBe("//p[0 = 1]");
    expect(cssSelectorToXPath("p:nth-of-type(even)")).toBe("//p[position() mod 2 = 0]");
    expect(cssSelectorToXPath("p:nth-of-type(odd)")).toBe("//p[position() mod 2 = 1]");
    expect(cssSelectorToXPath("button:not(.disabled)")).toBe(
      "//button[not(contains(concat(' ', normalize-space(@class), ' '), ' disabled '))]"
    );
    expect(cssSelectorToXPath("input:not([disabled])")).toBe("//input[not(@disabled)]");
  });

  it("returns feature list", () => {
    const features = getSupportedSelectorFeatures();
    expect(features.elements).toBe(true);
    expect(features.pseudoClasses).toContain(":first-child");
    expect(features.unsupported).toContain(":hover");
  });

  it("validates CSS selectors and throws on unsupported or malformed syntax", () => {
    expect(validateCssSelector("div > p").valid).toBe(true);
    expect(validateCssSelector("div:hover").valid).toBe(false);
    expect(() => cssSelectorToXPath("div:hover")).toThrow(UnsupportedError);
    expect(() => cssSelectorToXPath("div::before")).toThrow(UnsupportedError);
    expect(() => cssSelectorToXPath("")).toThrow(ValidationError);
    expect(() => cssSelectorToXPath("div[unclosed")).toThrow(ParsingError);
  });
});
