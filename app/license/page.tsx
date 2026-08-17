import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "Open-source licence",
  description: "The licence and trademark terms for FarmerBook source code.",
};

export default function LicensePage() {
  return (
    <PolicyLayout
      eyebrow="Open source"
      title="FarmerBook source-code licence"
      updated="18 August 2026"
    >
      <h2>Strong copyleft: AGPL-3.0-only</h2>
      <p>
        FarmerBook source code is open source under the GNU Affero General Public
        License version 3 only (AGPL-3.0-only). It is copyrighted code, not public
        domain software.
      </p>
      <p>
        You may use, study, modify, copy and redistribute the code only while
        following that licence. This includes preserving copyright and licence
        notices, licensing covered modifications under AGPL-3.0-only, and offering
        the complete Corresponding Source to users who interact with a modified
        version over a network. Copying outside those terms is not authorised.
      </p>
      <h2>FarmerBook name and identity</h2>
      <p>
        The source-code licence does not grant permission to use the FarmerBook
        name, logo, domain names or other brand identifiers in a way that suggests
        endorsement or causes confusion. Those brand assets remain reserved.
      </p>
      <p>
        The full licence text accompanies the source repository. You can also read
        it on the <a href="https://www.gnu.org/licenses/agpl-3.0.html">GNU project website</a>.
      </p>
    </PolicyLayout>
  );
}
