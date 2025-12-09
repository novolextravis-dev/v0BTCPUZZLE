"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Lock } from "lucide-react"

const phases = [
  {
    id: 1,
    title: "Phase 1: Binary Matrix",
    description: "Decode 14x14 binary matrix from colored squares",
    status: "complete",
    steps: [
      "Convert colored squares to binary (black/blue=1, yellow/white=0)",
      "Read spiral pattern counterclockwise from upper left",
      "Convert binary to ASCII characters",
      "Result: gsmg.io/theseedisplanted",
    ],
  },
  {
    id: 2,
    title: "Phase 2: Hidden Form",
    description: "Find and submit hidden password form",
    status: "complete",
    steps: [
      "Analyze images for song reference (The Warning by Logic)",
      "Find hidden POST form in browser debug mode",
      "Password: theflowerblossomsthroughwhatseemstobeaconcretesurface",
      "Redirected to next phase",
    ],
  },
  {
    id: 3,
    title: "Phase 3: Matrix Reference",
    description: "AES-256-CBC decryption with causality",
    status: "complete",
    steps: [
      'Password from Matrix Reloaded: "causality"',
      "SHA256(causality) as decryption key",
      "Decrypt with OpenSSL: openssl enc -aes-256-cbc -d -a",
      "Reveals multi-part password puzzle",
    ],
  },
  {
    id: 4,
    title: "Phase 3.1: Seven-Part Password",
    description: "Concatenate 7 password components",
    status: "complete",
    steps: [
      "1. causality",
      "2. Safenet (from 2name hint)",
      "3. Luna (from latin 3Moon)",
      "4. HSM (from 4How so mate)",
      "5. 11110 (JFK Executive Order)",
      "6. 0x736B6E... (Bitcoin genesis block)",
      "7. Chess position notation",
    ],
  },
  {
    id: 5,
    title: "Phase 3.2: Triple Password",
    description: "Three-part password with various references",
    status: "complete",
    steps: [
      '1. jacquefresco (from "future is ours" quote)',
      "2. giveitjustonesecond (Alice in Wonderland)",
      "3. heisenbergsuncertaintyprinciple",
      "SHA256 concatenation for final decryption",
    ],
  },
  {
    id: 6,
    title: "Phase 3.2.1: Beaufort Cipher",
    description: "Decode with THEMATRIXHASYOU key",
    status: "complete",
    steps: [
      "Convert special characters to letters",
      "Use IBM EBCDIC 1141 encoding",
      "Key: THEMATRIXHASYOU",
      "Reveals message about completing puzzle",
    ],
  },
  {
    id: 7,
    title: "Phase 3.2.2: VIC Cipher",
    description: "Final number sequence decryption",
    status: "in-progress",
    steps: [
      "Input: 15165943121972409...",
      "Alphabet: FUBCDORA.LETHINGKYMVPS.JQZXW",
      "Digits: 1 and 4",
      "Output message about private keys",
    ],
  },
  {
    id: 8,
    title: "SalPhaseIon & Cosmic Duality",
    description: "Hidden phase with binary segments",
    status: "locked",
    steps: [
      "Hash puzzle text: SHA256(GSMGIO5BTCPUZZLECHALLENGE...)",
      "Access hidden URL with hash",
      'Decode binary "abba" patterns',
      "AES blob decryption pending",
    ],
  },
]

export function PuzzleTracker() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">Puzzle Progress Tracker</h2>
          <p className="text-sm text-muted-foreground">Track your progress through the multi-phase GSMG.IO puzzle</p>
        </div>

        <div className="space-y-4">
          {phases.map((phase, index) => (
            <Card key={phase.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {phase.status === "complete" ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : phase.status === "in-progress" ? (
                    <Circle className="h-6 w-6 text-blue-500" />
                  ) : (
                    <Lock className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{phase.title}</h3>
                      <p className="text-sm text-muted-foreground">{phase.description}</p>
                    </div>
                    <Badge
                      variant={
                        phase.status === "complete"
                          ? "default"
                          : phase.status === "in-progress"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {phase.status === "complete"
                        ? "Complete"
                        : phase.status === "in-progress"
                          ? "In Progress"
                          : "Locked"}
                    </Badge>
                  </div>

                  <ul className="space-y-1.5 text-sm">
                    {phase.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-2 text-muted-foreground">
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Reference</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Prize Address</h4>
            <p className="text-xs font-mono text-muted-foreground break-all">1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Original Prize</h4>
            <p className="text-xs text-muted-foreground">5 BTC (halved to 2.5 BTC, now 1.5 BTC)</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Start Date</h4>
            <p className="text-xs text-muted-foreground">April 13, 2019</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Status</h4>
            <p className="text-xs text-muted-foreground">Unsolved</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
