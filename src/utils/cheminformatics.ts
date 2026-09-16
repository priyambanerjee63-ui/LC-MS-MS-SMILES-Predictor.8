import { AdductType } from '../types';

// Accurate monoisotopic atomic masses
export const ATOM_MASSES: Record<string, number> = {
  H: 1.0078250322,
  C: 12.000000000,
  N: 14.003074004,
  O: 15.994914619,
  F: 18.998403163,
  Na: 22.98976928,
  P: 30.973761998,
  S: 31.972071174,
  Cl: 34.96885268,
  K: 38.96370668,
  Br: 78.9183371,
  I: 126.904473,
};

export const ADDUCT_DELTAS: Record<AdductType, number> = {
  '[M+H]+': 1.007276,
  '[M+Na]+': 22.989218,
  '[M+K]+': 38.963158,
  '[M+NH4]+': 18.033823,
  '[M-H]-': -1.007276,
  '[M+HCOO]-': 44.998201,
  '[M+CH3COO]-': 59.013851,
};

// Characteristic neutral losses in LC-MS/MS
export const KNOWN_NEUTRAL_LOSSES: { delta: number; tolerance: number; name: string; formula: string }[] = [
  { delta: 15.0235, tolerance: 0.05, name: 'Methyl loss', formula: 'CH3' },
  { delta: 17.0265, tolerance: 0.05, name: 'Ammonia loss', formula: 'NH3' },
  { delta: 18.0106, tolerance: 0.05, name: 'Water loss (dehydration)', formula: 'H2O' },
  { delta: 27.9949, tolerance: 0.05, name: 'Carbon monoxide loss', formula: 'CO' },
  { delta: 28.0313, tolerance: 0.05, name: 'Ethylene loss', formula: 'C2H4' },
  { delta: 32.0262, tolerance: 0.05, name: 'Methanol loss', formula: 'CH4O' },
  { delta: 35.9767, tolerance: 0.05, name: 'Hydrochloric acid loss', formula: 'HCl' },
  { delta: 42.0106, tolerance: 0.05, name: 'Ketene / acetyl loss', formula: 'C2H2O' },
  { delta: 43.9898, tolerance: 0.05, name: 'Carbon dioxide (decarboxylation)', formula: 'CO2' },
  { delta: 45.0215, tolerance: 0.05, name: 'Formic acid / ethylamine', formula: 'CH2O2' },
  { delta: 58.0055, tolerance: 0.05, name: 'Acetone loss', formula: 'C3H6O' },
  { delta: 79.9568, tolerance: 0.05, name: 'Sulfur trioxide / phosphate loss', formula: 'SO3' },
  { delta: 162.0528, tolerance: 0.08, name: 'Hexose (glycoside) loss', formula: 'C6H10O5' },
  { delta: 176.0321, tolerance: 0.08, name: 'Glucuronide loss', formula: 'C6H8O6' },
];

/**
 * Parses simple molecular formulas like "C9H8O4" into atom counts.
 */
export function parseFormula(formula: string): Record<string, number> {
  const counts: Record<string, number> = {};
  const regex = /([A-Z][a-z]?)([0-9]*)/g;
  let match;
  while ((match = regex.exec(formula)) !== null) {
    if (match[0] === '') break;
    const elem = match[1];
    const count = match[2] ? parseInt(match[2], 10) : 1;
    counts[elem] = (counts[elem] || 0) + count;
  }
  return counts;
}

/**
 * Calculates exact monoisotopic mass from formula string or atom counts.
 */
export function calculateExactMass(formulaOrCounts: string | Record<string, number>): number {
  const counts = typeof formulaOrCounts === 'string' ? parseFormula(formulaOrCounts) : formulaOrCounts;
  let mass = 0;
  for (const [elem, count] of Object.entries(counts)) {
    if (ATOM_MASSES[elem]) {
      mass += ATOM_MASSES[elem] * count;
    }
  }
  return mass;
}

/**
 * Derives molecular formula from SMILES representation.
 * Handles aromatic and standard organic atoms (C, N, O, S, P, F, Cl, Br, I) and computes implicit hydrogens.
 */
export function deriveFormulaFromSmiles(smiles: string): { formula: string; exactMass: number; counts: Record<string, number> } {
  const counts: Record<string, number> = { C: 0, H: 0, N: 0, O: 0, S: 0, P: 0, F: 0, Cl: 0, Br: 0, I: 0 };
  
  // Clean charges and stereochemistry for gross formula counting
  const sanitized = smiles.replace(/\[([^\]]+)\]/g, (match, contents) => {
    // Explicit bracket atoms like [O-], [NH4+], [OH]
    const elemMatch = contents.match(/([A-Z][a-z]?)/);
    const hMatch = contents.match(/H([0-9]?)/);
    if (elemMatch) {
      const elem = elemMatch[1];
      counts[elem] = (counts[elem] || 0) + 1;
    }
    if (hMatch) {
      const hCount = hMatch[1] ? parseInt(hMatch[1], 10) : 1;
      counts.H = (counts.H || 0) + hCount;
    }
    return '';
  });

  // Count standard and aromatic tokens
  for (let i = 0; i < sanitized.length; i++) {
    const c = sanitized[i];
    const next = sanitized[i + 1] || '';
    
    if (c === 'C' && next === 'l') {
      counts.Cl = (counts.Cl || 0) + 1;
      i++;
    } else if (c === 'B' && next === 'r') {
      counts.Br = (counts.Br || 0) + 1;
      i++;
    } else if (c === 'C' || c === 'c') {
      counts.C = (counts.C || 0) + 1;
    } else if (c === 'N' || c === 'n') {
      counts.N = (counts.N || 0) + 1;
    } else if (c === 'O' || c === 'o') {
      counts.O = (counts.O || 0) + 1;
    } else if (c === 'S' || c === 's') {
      counts.S = (counts.S || 0) + 1;
    } else if (c === 'P') {
      counts.P = (counts.P || 0) + 1;
    } else if (c === 'F') {
      counts.F = (counts.F || 0) + 1;
    } else if (c === 'I') {
      counts.I = (counts.I || 0) + 1;
    }
  }

  // Ring and bond counting for hydrogen balancing
  const doubleBonds = (smiles.match(/=/g) || []).length;
  const tripleBonds = (smiles.match(/#/g) || []).length;
  const ringMatches = smiles.match(/[0-9]/g) || [];
  const rings = Math.floor(ringMatches.length / 2);
  const aromaticCount = (smiles.match(/[cnos]/g) || []).length;

  // Approximate valency for organic H count if not already explicit
  const heavyAtoms = counts.C + counts.N + counts.O + counts.S + counts.P + counts.F + counts.Cl + counts.Br + counts.I;
  if (counts.H === 0 && counts.C > 0) {
    const degreesOfUnsaturation = rings + doubleBonds + (tripleBonds * 2) + Math.floor(aromaticCount / 2);
    // Formula for degrees of unsaturation: DoU = C + 1 + N/2 - H/2 - Halogens/2
    const halogens = counts.F + counts.Cl + counts.Br + counts.I;
    const estH = Math.max(0, Math.round(2 * (counts.C + 1 + counts.N / 2 - degreesOfUnsaturation - halogens / 2)));
    counts.H = estH;
  }

  // Assemble Hill system formula (C first, then H, then alphabetical)
  let formula = '';
  if (counts.C > 0) formula += `C${counts.C > 1 ? counts.C : ''}`;
  if (counts.H > 0) formula += `H${counts.H > 1 ? counts.H : ''}`;
  
  const others = Object.keys(counts)
    .filter(k => k !== 'C' && k !== 'H' && counts[k] > 0)
    .sort();

  for (const elem of others) {
    formula += `${elem}${counts[elem] > 1 ? counts[elem] : ''}`;
  }

  const exactMass = calculateExactMass(counts);
  return { formula: formula || 'Unknown', exactMass, counts };
}

/**
 * Validates basic SMILES syntax.
 */
export function isValidSmiles(smiles: string): boolean {
  if (!smiles || smiles.trim().length === 0) return false;
  const s = smiles.trim();

  // Check balanced parentheses
  let parens = 0;
  let brackets = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') parens++;
    if (s[i] === ')') parens--;
    if (s[i] === '[') brackets++;
    if (s[i] === ']') brackets--;
    if (parens < 0 || brackets < 0) return false;
  }
  if (parens !== 0 || brackets !== 0) return false;

  // Check ring closures (every digit should appear an even number of times)
  const digits: Record<string, number> = {};
  let inBracket = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '[') inBracket = true;
    else if (s[i] === ']') inBracket = false;
    else if (!inBracket && /[0-9]/.test(s[i])) {
      digits[s[i]] = (digits[s[i]] || 0) + 1;
    }
  }
  for (const count of Object.values(digits)) {
    if (count % 2 !== 0) return false;
  }

  // Must contain valid organic chemical characters
  const validChars = /^[A-Za-z0-9()\[\]=@#\+\-\\/:%.]+$/;
  return validChars.test(s);
}

/**
 * Simulates a topological circular fingerprint (ECFP4-like) for SMILES strings
 * using k-mer subgraph hashing and functional group keys.
 */
export function generateMorganFingerprint(smiles: string, numBits = 1024): Set<number> {
  const bits = new Set<number>();
  if (!smiles) return bits;

  const s = smiles.trim();
  
  // 1. Structural Substring k-mers (path lengths 1 to 4)
  for (let k = 1; k <= 4; k++) {
    for (let i = 0; i <= s.length - k; i++) {
      const sub = s.substring(i, i + k);
      let hash = 0;
      for (let j = 0; j < sub.length; j++) {
        hash = (hash * 31 + sub.charCodeAt(j)) >>> 0;
      }
      bits.add(hash % numBits);
    }
  }

  // 2. Specific Chemical Functional Substructures
  const patterns: [string, RegExp][] = [
    ['carbonyl', /C=O|O=C/],
    ['ester', /C\(=O\)O|OC\(=O\)/],
    ['carboxylic_acid', /C\(=O\)O[H]?/],
    ['amide', /C\(=O\)N|NC\(=O\)/],
    ['aromatic_benzene', /c1ccccc1|c1ccc\(.+?\)cc1/],
    ['pyridine_like', /c1ccccn1|n1ccccc1/],
    ['hydroxyl', /O[H]|\[OH\]/],
    ['amine_primary', /N[H]2|\[NH2\]/],
    ['amine_secondary', /N[H]|\[NH\]/],
    ['ether', /COC|COc/],
    ['halogen_fluorine', /F/],
    ['halogen_chlorine', /Cl/],
    ['halogen_bromine', /Br/],
    ['nitro_group', /\[N\+\]\(=O\)\[O-\]|NO2/],
    ['sulfonamide', /S\(=O\)\(=O\)N/],
    ['thiol', /S[H]/],
    ['phosphate', /P\(=O\)/],
    ['xanthine_core', /n1c\(=O\)n\(C\)c2/],
    ['flavonoid_chromone', /c1cc2c\(cc1\)c\(=O\)cc\(o2\)/],
    ['spiro_center', /C1\(.+?\)2/],
  ];

  patterns.forEach(([name, regex], idx) => {
    if (regex.test(s)) {
      bits.add((idx * 53 + 7) % numBits);
    }
  });

  return bits;
}

/**
 * Computes Tanimoto Similarity between two SMILES:
 * T(A, B) = |A ∩ B| / |A ∪ B|
 * Returns a value between 0.00 and 1.00.
 */
export function calculateTanimotoSimilarity(smilesA: string, smilesB: string): number {
  if (!smilesA || !smilesB) return 0;
  if (smilesA.trim() === smilesB.trim()) return 1.0;

  const fpA = generateMorganFingerprint(smilesA);
  const fpB = generateMorganFingerprint(smilesB);

  if (fpA.size === 0 && fpB.size === 0) return 1.0;
  if (fpA.size === 0 || fpB.size === 0) return 0.0;

  let intersection = 0;
  for (const bit of fpA) {
    if (fpB.has(bit)) {
      intersection++;
    }
  }

  const union = fpA.size + fpB.size - intersection;
  return union === 0 ? 0 : Number((intersection / union).toFixed(4));
}

/**
 * Computes Levenshtein edit distance between two strings (SMILES tokens).
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Calculates PPM mass error: |calcMass - expMass| / expMass * 1,000,000
 */
export function calculatePpmError(calculatedMass: number, experimentalMass: number): number {
  if (experimentalMass <= 0) return 999;
  return Number((Math.abs(calculatedMass - experimentalMass) / experimentalMass * 1000000).toFixed(2));
}

/**
 * Identifies neutral loss from precursor m/z and fragment m/z.
 */
export function identifyNeutralLoss(precursorMz: number, fragmentMz: number): { delta: number; annotation?: string } {
  const delta = Number((precursorMz - fragmentMz).toFixed(4));
  if (delta <= 0) return { delta: 0 };

  for (const item of KNOWN_NEUTRAL_LOSSES) {
    if (Math.abs(delta - item.delta) <= item.tolerance) {
      return { delta, annotation: `-${item.formula} (${item.name})` };
    }
  }
  return { delta, annotation: `-${delta.toFixed(2)} Da` };
}
