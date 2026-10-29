import { LITERATURE } from '../../evidence';
import { APP_VERSION } from '../../version';

export function AboutPage() {
  const lit = LITERATURE.constraints;
  const enabled = lit.filter((k) => k.automatedEvaluation).length;
  return (
    <>
      <h1>About &amp; validation status</h1>
      <div className="card">
        <h2>Purpose</h2>
        <p>
          ReRT Workbench is a research and educational prototype for exploring previous organ-at-risk (OAR) doses, comparing published
          reirradiation constraints, evaluating proposed plans and preparing a discussion summary. It works with fictional cases only and
          never decides whether radiotherapy should be offered or refused.
        </p>
        <p className="small">App v{APP_VERSION} · Evidence dataset v{LITERATURE.datasetVersion} (search date {LITERATURE.searchDate}) · {LITERATURE.sources.length} sources · {enabled} of {lit.length} records enabled for automated evaluation.</p>
      </div>
      <div className="card">
        <h2>Validation status</h2>
        <table>
          <tbody>
            <tr><th>Software testing</th><td>Calculation engine unit-tested against independently worked examples; UI flows covered by end-to-end tests. See the repository <span className="mono">tests/</span> folder.</td></tr>
            <tr><th>Source extraction</th><td>Numerical values are enabled only when an exact quote was matched against downloaded open-access full text. Paywalled or ambiguous items are listed but not used.</td></tr>
            <tr><th>Independent clinical validation</th><td><b>Not performed.</b> No radiation oncologist or medical physicist has independently validated the dataset, calculations or outputs.</td></tr>
            <tr><th>Medical-physics validation</th><td><b>Not performed.</b> No comparison against a treatment planning system or registered dose accumulation.</td></tr>
            <tr><th>Regulatory status</th><td>Not a medical device. Not for clinical use.</td></tr>
          </tbody>
        </table>
      </div>
      <div className="card">
        <h2>Supported scenarios</h2>
        <ul>
          <li>Photon/electron external-beam courses, equal-fraction phases, near-maximum point metrics (Dmax, D≤1cc, D≤2%) converted per phase with the LQ model.</li>
          <li>Cumulative EQD2/BED summation of near-maximum metrics when the spatial basis is documented or a conservative worst-case assumption is chosen.</li>
          <li>Per-course limits applied to the proposed course; per-reference α/β recomputation; headroom and conditional physical ceiling.</li>
          <li>Recovery-adjusted scenarios only where a documented model with verified values applies to the organ, setting and number of prior courses.</li>
        </ul>
        <h2>Known limitations</h2>
        <ul>
          <li>No DVH import, no voxel-wise or deformable dose accumulation.</li>
          <li>Mean-dose and Vx constraints are not converted or summed (flagged for review).</li>
          <li>Proton/carbon RBE, brachytherapy, dose-rate effects and unequal fractionation are flagged for review, not modelled.</li>
          <li>Evidence coverage is limited to accessible full text; several key guidance documents are paywalled and their numbers are listed as unavailable.</li>
          <li>Literature values often come from small retrospective series; many are observed associations, not tolerance limits.</li>
        </ul>
      </div>
      <div className="card">
        <h2>Privacy</h2>
        <p>Cases live only in this browser’s localStorage. Nothing is sent to a server. There are no accounts. Do not enter real patient identifiers.</p>
      </div>
    </>
  );
}
