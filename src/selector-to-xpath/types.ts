export interface SelectorToXPathOptions {
  relative?: boolean; // If true, start with .// instead of //
}

export interface SupportedSelectorFeatures {
  elements: boolean;
  universal: boolean;
  id: boolean;
  class: boolean;
  attributeExistence: boolean;
  attributeEquality: boolean;
  attributePrefix: boolean;
  attributeSuffix: boolean;
  attributeSubstring: boolean;
  descendantCombinator: boolean;
  childCombinator: boolean;
  adjacentSiblingCombinator: boolean;
  generalSiblingCombinator: boolean;
  selectorGroups: boolean;
  pseudoClasses: string[];
  unsupported: string[];
}
