# Search log: general (cross-site) reirradiation guidance
Date: 2026-10-29. Agent scope: the five starting sources, plus open-access general (cross-site) guidance they cite on dose summation, recovery and reporting.

## Databases and queries
- Europe PMC REST: `DOI:"10.1016/j.radonc.2025.111313"`, `DOI:"10.1016/S1470-2045(25)00562-5"`, `DOI:"10.1016/j.radonc.2024.110696"`, `PMCID:PMC12305692`. Only PMC12305692 was OA in PMC.
- Europe PMC: `(TITLE:"reirradiation" OR TITLE:"re-irradiation") AND TITLE:"head and neck" AND TITLE:"consensus"` gave 1 hit (Lancet Oncol 2026, DOI 10.1016/S1470-2045(26)00174-9, not OA).
- Europe PMC: `TITLE:"Reirradiation Collaborative Group"` gave 12 hits. All were screened. They are surveys or site-specific papers, or not OA. None was a general constraint source.
- Europe PMC: `TITLE:"reirradiation" AND SRC:PPR` gave 15 hits. Screened; 1 kept (Feng/Gopalakrishnan medRxiv TCDA preprint).
- Europe PMC: `(TITLE:"re-irradiation" OR TITLE:"reirradiation") AND (TITLE:"dose accumulation" OR "cumulative dose" OR "tissue recovery" OR "dose summation") AND OPEN_ACCESS:Y` gave 8 hits. 1 kept (phiRO 2026 companion paper); the others are site-specific.
- Europe PMC DOI lookups for cited references: West 2025 (10.1016/j.radonc.2024.110587), Paradis 2019 (PMC6817723, OA), ESTRO-EORTC 2022 (10.1016/S1470-2045(22)00447-8), Paradis & Matuszak 2020, Murr 2023 (PMC11877414, OA), Bentzen 2012, Marks 2025 (ReCOG editorial).
- Unpaywall and Crossref were used to check licences. Crossref listed CC BY 4.0 for the ESTRO 2025 and ESTRO/EANO GBM papers.
- WebSearch was used only to find the RCR "Principles of reirradiation" PDF URL.

## Retrieval methods
- PMC XML came from the Europe PMC fullTextXML endpoint. Supplementary files came from Europe PMC supplementaryFiles (Paradis appendices E1/E2 PDFs, converted to text with pypdf 5.1.0 in a scratch venv).
- curl requests to ScienceDirect, thegreenjournal.com and Lancet returned 403, and the Elsevier API returned metadata only. The two OA Radiother Oncol articles (and the corrigendum) were therefore opened in the Claude browser pane. The rendered `<article>` innerText was saved byte-for-byte through a local form POST receiver, so the text is verbatim. Tables are flattened.
- The RCR PDF was fetched directly with curl and converted with pypdf.
- The medRxiv JATS XML (v2) was fetched through the bioRxiv API link.
- Every quote was machine-checked as a whitespace-normalised substring of the declared fullTextFile (42 constraint records and 10 recovery models; 0 failures).

## Inclusion / exclusion
- Included: consensus, guideline or methodological sources covering cross-site cumulative dose evaluation, alpha/beta choice, recovery, or reporting, with OA full text.
- Excluded: site-specific constraint papers (left to other agents), surveys, and non-OA items.

## Wanted but not accessible
- ReCOG dose evaluation consensus (Lancet Oncol 2026): paywalled, abstract only, and the abstract has no numbers.
- International rHNSCC consensus: the eScholarship 4kq0x28z item and PDF are behind a proof-of-work bot check (BotStopper), which was not bypassed. The Lancet version is paywalled. **A manual download by the user is needed.**
- ESTRO-EORTC re-irradiation consensus (Lancet Oncol 2022): paywalled.
- West et al. 2025, "Consistency in reirradiation scenarios: terminology, tissue recovery…" (Radiother Oncol 202:110587): paywalled. This is the reference cited by ESTRO 2025 for the recovery scaling factor and is likely important.
- Marks 2025 ReCOG editorial (IJROBP), Paradis & Matuszak 2020 (Semin Radiat Oncol), Bentzen 2012: not OA.
- The ESTRO/EANO GBM supplement (systematic review) was not retrieved; it is not needed for numeric content.

## Coverage gaps
- None of the general guidance documents gives numeric organ limits. ESTRO 2025, Danish, RCR, ReCOG(abstract) and GBM all defer to site-specific constraints.
- The only cross-site numeric OAR table found is the University of Michigan institutional form (Paradis 2019 Appendix E2). It is labelled example-only and not endorsed outside UM.
- The time-dependent recovery models in the TCDA preprint are given only as equation images, so no constants were extracted.
