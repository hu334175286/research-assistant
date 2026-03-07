/**
 * Generate BibTeX entry for a paper
 * @param {Object} paper - Paper object from Prisma
 * @returns {string} BibTeX formatted string
 */
export function generateBibTeX(paper) {
  const summary = parseSummaryJson(paper?.summaryJson);
  
  // Extract authors from summary or use default
  const authors = summary?.authors?.join(' and ') || 'Unknown Author';
  
  // Extract year from paper or summary
  const year = paper.year || summary?.year || new Date().getFullYear();
  
  // Create a clean citation key from title
  const citationKey = createCitationKey(paper.title, authors, year);
  
  // Determine entry type (default to article for arXiv papers)
  const entryType = summary?.arxivId ? 'article' : 'misc';
  
  // Build BibTeX fields
  let bibtex = `@${entryType}{${citationKey},\n`;
  bibtex += `  author = {${authors}},\n`;
  bibtex += `  title = {${paper.title}},\n`;
  
  if (year) {
    bibtex += `  year = {${year}},\n`;
  }
  
  if (summary?.arxivId) {
    bibtex += `  eprint = {${summary.arxivId}},\n`;
    bibtex += `  archivePrefix = {arXiv},\n`;
  }
  
  if (summary?.url) {
    bibtex += `  url = {${summary.url}},\n`;
  }
  
  if (paper.venueTier && paper.venueTier !== 'unknown') {
    bibtex += `  note = {Venue Tier: ${paper.venueTier}},\n`;
  }
  
  if (paper.tags) {
    bibtex += `  keywords = {${paper.tags}},\n`;
  }
  
  // Remove trailing comma and close
  bibtex = bibtex.replace(/,\n$/, '\n');
  bibtex += '}';
  
  return bibtex;
}

/**
 * Create a citation key from title, authors, and year
 * @param {string} title - Paper title
 * @param {string} authors - Authors string
 * @param {number} year - Publication year
 * @returns {string} Citation key
 */
function createCitationKey(title, authors, year) {
  // Get first author's last name
  const firstAuthor = authors.split(' and ')[0]?.split(' ').pop()?.toLowerCase() || 'unknown';
  
  // Get first significant word from title
  const titleWords = title.toLowerCase().split(/\s+/);
  const firstWord = titleWords.find(word => word.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(word)) || 'paper';
  
  // Clean the key (remove special characters)
  const cleanKey = `${firstAuthor}${year}${firstWord}`.replace(/[^a-z0-9]/gi, '');
  
  return cleanKey;
}

/**
 * Parse summary JSON from paper
 * @param {string} summaryJson - JSON string
 * @returns {Object} Parsed object
 */
function parseSummaryJson(summaryJson) {
  if (!summaryJson) return {};
  try {
    return JSON.parse(summaryJson);
  } catch {
    return {};
  }
}
