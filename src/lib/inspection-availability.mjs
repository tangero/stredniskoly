/**
 * @param {{ parsed_output?: { for_parents?: { plain_czech_summary?: string } } }} inspection
 * @returns {boolean}
 */
export function hasInspectionSummary(inspection) {
  return Boolean(inspection.parsed_output?.for_parents?.plain_czech_summary);
}
