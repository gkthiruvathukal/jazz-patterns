# Publication Ideas

This project is a plausible research paper because it sits at the intersection of
computer science, music, AI-assisted software engineering, symbolic music
representation, and music pedagogy. The strongest paper should not read as only a
tool announcement. It should make a research contribution around the design,
implementation, and evaluation of a reproducible music-practice generation
pipeline.

## Possible Paper Framing

Working title:

> From Music-Theory Model to Printable and Interactive Jazz Practice Systems: A
> Reproducible Software Pipeline for Notation, Playback, and Pedagogy

Core claim:

- A compact, inspectable Python music-theory model can generate multiple aligned
  artifacts: LilyPond/Abjad notation, PDFs, MIDI, WAV files, a merged book, and a
  browser-based interactive practice tool.
- The web app is intentionally a renderer/player over generated data, not a
  second implementation of the theory model.
- The work demonstrates a practical software-engineering pattern for music tools:
  single source of truth, generated artifacts, committed data contracts,
  reproducible builds, CI, PWA/offline delivery, and demo-video automation.
- AI assistance is part of the engineering story, but the durable contribution is
  the human-reviewable artifact, architecture, and reproducible workflow.

Possible evaluation angles:

- Artifact evaluation: generated notation matches the model; JSON contract
  matches the Python source of truth; web playback and notation stay aligned.
- Pedagogical evaluation: musicians/students use the tool for all-key scale and
  interval practice; collect qualitative feedback on usefulness, readability,
  audio support, and practice flow.
- Software-engineering evaluation: describe how generated assets, CI, Pages
  deployment, PWA caching, and demo generation support reproducibility.
- AI/software-engineering reflection: document where AI accelerated development,
  what required human musical judgment, and which guardrails prevented theory or
  notation regressions.

## Related Systems and Competitors

The strongest claim is not that no related apps exist. Several serious tools
cover parts of this space. The stronger and more defensible claim is that this
project combines features that are usually separated: open-source
reproducibility, generated printable jazz practice material, interactive web
notation/playback, all-key scale and interval practice, and a single auditable
music-theory model that produces both print and web artifacts.

| Tool | Main focus | Open source? | Fees | Actively maintained? | Printable materials? | How this project differs |
| --- | --- | --- | --- | --- | --- | --- |
| Jazz Scales Practice | Jazz scale/mode practice, notation, playback, print book, generated web app | Yes, MIT | Free | Yes | Yes: PDFs/book plus generated notation | Single source of truth, printable plus interactive, open reproducible pipeline, jazz/pro audience, all-key generated materials |
| iReal Pro | Jazz chord charts and backing tracks | No evidence of open source | Paid one-time purchase per platform; no subscription | Yes | Chord charts, but not scale-practice books | Strong jazz comparator, but focused on play-along/chord charts rather than generated scale/mode pedagogy or print practice materials |
| Tessitura Pro Scales | Scale/mode visualizer and practice encyclopedia | No evidence of open source | App Store lists monthly, yearly, and lifetime purchases | Yes, appears current | Not obvious; app-centered | Closest scale comparator. This project is open, printable, model-driven, and built as a web/PDF/audio artifact pipeline rather than a closed app product |
| EarMaster | Ear training, sight-singing, rhythm, classroom tools | No evidence of open source | Paid subscriptions, all-access passes, and education licensing | Yes | Not primarily printable scale materials | Serious education comparator, but mainly aural-skills training, not jazz scale chart generation |
| Auralia / Musition | Institutional ear training and music theory curriculum | No evidence of open source | Paid student, home, cloud, and school licenses | Yes | Assessment/course materials, but not generated jazz scale books | Strong classroom comparator; stronger LMS/assessment story, weaker open reproducible artifact story |
| musictheory.net / Tenuto | Theory drills, calculators, ear training | No evidence of open source | Website free; Tenuto paid iOS app | Yes | Limited; not a generated practice-book pipeline | Broad theory drills and calculators, not professional jazz scale practice |
| teoria.com | Theory tutorials, ear training, sight singing | Not open source; exercise pages indicate restrictive Creative Commons content terms | Mostly free/donation-supported | Yes, long-running | Web exercises/reference, not generated print books | Important free web comparator, but not a jazz/pro scale-material generator |
| TonalEnergy | Tuner, metronome, recorder, practice feedback | No evidence of open source | Paid app and education licenses | Yes | No | Professional-practice app, but not a scale/theory/practice-material system |
| ToneGym | Gamified ear training | No evidence of open source | Free tier plus paid Pro plans | Yes | No | Ear-training/gamification comparator, not notation/print/jazz scale pipeline |

Sources checked:

- iReal Pro: <https://www.irealpro.com/> and <https://technimo.helpshift.com/hc/en/3-ireal-pro/faq/339-using-ireal-pro-on-multiple-devices/>
- Tessitura Pro Scales: <https://mdecks.com/tessituramac.phtml> and <https://apps.apple.com/us/app/tessitura-pro-scales/id6745803127>
- EarMaster: <https://www.earmaster.com/products/ear-training-sight-singing/version-comparison.html> and <https://www.earmaster.com/products/ear-training-sight-singing/earmaster-cloud-edition.html>
- Auralia / Musition: <https://www.risingsoftware.com/shop> and <https://www.risingsoftware.com/shop/education>
- musictheory.net / Tenuto: <https://www.musictheory.net/products/tenuto> and <https://www.musictheory.net/news>
- teoria.com: <https://www.teoria.com/> and <https://www.teoria.com/en/exercises/>
- TonalEnergy: <https://www.tonalenergy.com/> and <https://www.tonalenergy.com/te-education>
- ToneGym: <https://www.tonegym.co/>

### Positioning Note: iReal Pro

iReal Pro should be treated as a respected adjacent system, not as something this
project is trying to replace. It is a favorite app and an important jazz-practice
tool, but its center of gravity is different: jazz chord charts, transposition,
accompaniment, rhythms, and play-along practice. It does not focus on showing
scales and modes, including the expanded scale vocabulary planned for this
project.

There is future overlap because jazz charts and rhythmic/accompaniment features
are on this project's roadmap. Even then, the goal should not be to compete with
iReal Pro on what it already does well. A better framing is that this project's
model-driven scale, notation, printable-material, and pedagogy ideas could
complement or even suggest ways to improve tools like iReal Pro.

## Two-Paper Strategy

This work likely supports two separate papers. Keeping them separate avoids
forcing one paper to do too much and lets each paper satisfy a different review
community.

### Paper 1: Research and Technology

Working title:

> A Reproducible Software Pipeline for Jazz Practice Materials: From Symbolic
> Music-Theory Models to Print, Audio, and Interactive Web Delivery

Primary contribution:

- A reproducible computational-music system for generating aligned practice
  artifacts from one source of truth.
- A software architecture that keeps theory in Python and uses generated JSON as
  the web-app contract.
- A practical example of AI-assisted but human-audited software engineering for
  music pedagogy.

Likely venues:

- ICMC
- NIME
- AIMC
- ISMIR, if the symbolic representation and evaluation angle is strengthened
- Music Encoding Conference, if framed around representation and publication
  pipelines

Evidence needed:

- Architecture diagrams.
- Code/data examples showing the scale model and generated artifacts.
- Correctness checks: interval labels, pitch spelling, LilyPond output, web JSON.
- Reproducibility story: CI, release artifacts, build scripts, static deployment.
- Screenshots, generated notation, and short demo video.

This paper can be written before a formal classroom study is complete.

### Paper 2: Classroom / Pedagogical Study

Working title:

> Evaluating an Interactive Jazz Scale Practice Tool in College Music Instruction

Primary contribution:

- Empirical evidence about how jazz students and faculty use the tool in real
  instruction or structured practice.
- Evidence about whether notation-plus-audio, all-key access, interval patterns,
  swing feel controls, and offline/mobile access help students practice more
  effectively.
- Faculty-facing insight into how computational practice materials integrate
  with jazz pedagogy.

Likely venues:

- CSEDU / Computer Supported Education
- SIGCSE, if the angle includes CS/music interdisciplinary teaching or software
  project pedagogy
- Music education journals or conferences, if the study emphasizes musicianship
  and learning outcomes more than technology
- NIME, if the paper emphasizes practice interaction and musical interface
  evaluation

Evidence needed:

- IRB-reviewed protocol, or documented exempt determination if applicable.
- Pre/post measures or structured faculty assessments.
- Student practice logs or self-reports.
- Faculty interviews.
- Qualitative analysis of student/faculty experience.
- Carefully bounded claims: usability, perceived usefulness, practice behavior,
  and early learning indicators rather than definitive claims of mastery unless
  the study design supports them.

This paper should wait until there is a defensible classroom protocol and data.

## Classroom Study Protocol Sketch

This section is a planning sketch for discussion with jazz faculty and an IRB
office. It is not legal advice or IRB approval language. The safest path is to
assume this is human-subjects research until the institution determines
otherwise.

### Study Purpose

Evaluate whether the Jazz Scales Practice web app supports jazz students'
practice of scales, modes, and interval patterns across keys, and understand how
jazz faculty integrate the tool into instruction.

### Core Research Questions

1. Does access to the tool change students' reported practice behavior for scales
   and modes across keys?
2. Do students perceive notation-plus-playback as useful for independent
   practice?
3. Do interval patterns, swing feel controls, and instrument playback help
   students practice beyond simple ascending/descending scale runs?
4. Do faculty find the generated charts and interactive app pedagogically useful?
5. What usability or musical-design changes are needed before broader adoption?

### Study Design Options

#### Option A: Low-Risk Usability and Classroom-Integration Study

Best first study. It is easier to approve, easier for faculty to run, and still
publishable as a formative evaluation.

Design:

- Participants use the tool during a normal instructional unit or assigned
  practice period.
- Students complete a short pre-survey, use the tool for 2-4 weeks, and complete
  a post-survey.
- Faculty complete an interview or structured reflection.
- Optional: students submit brief weekly practice reflections.

Claims supported:

- Perceived usefulness.
- Usability.
- Practice behavior changes by self-report.
- Faculty adoption barriers and pedagogical opportunities.

Claims not strongly supported:

- Objective performance improvement.
- Causal claims about learning outcomes.

#### Option B: Pre/Post Performance Study

Stronger but more work. This is appropriate if faculty can assess student
performance consistently.

Design:

- Students complete a short baseline performance task before the intervention.
- Students use the tool for a defined period, such as 4-6 weeks.
- Students complete a comparable post-task.
- Faculty or blinded raters evaluate recordings using a rubric.

Possible tasks:

- Play selected scales in multiple keys.
- Play a scale in thirds/fourths in a selected key.
- Improvise a short phrase over a chord/scale context using target material.
- Identify or perform scale-degree patterns.

Rubric dimensions:

- Pitch accuracy.
- Rhythmic steadiness.
- Fluency across keys.
- Accuracy of interval pattern.
- Tone/articulation, if relevant to the course.
- Musicality or application, if evaluating improvisation.

Claims supported:

- Early evidence of learning or performance change.
- Relationship between tool use and specific skill outcomes.

Design caution:

- Without a comparison group, this is still not a strong causal design.
- Blinded scoring helps reduce bias.

#### Option C: Comparison Group Study

Most rigorous, but harder to run and approve.

Design:

- One section or group uses the tool; another uses usual practice materials.
- Both groups receive equivalent assignments and pre/post assessments.
- Groups should be comparable in level, instructor expectations, and practice
  time.

Claims supported:

- Stronger evidence that the tool affects practice or learning compared with
  existing materials.

Design caution:

- Avoid disadvantaging students. A waitlist design can give the comparison group
  access after the study.
- Instructor effects and small sample sizes may still limit conclusions.

### Recommended First Protocol

Start with Option A plus a light version of Option B:

- Duration: 4 weeks.
- Participants: students in one or more jazz/improvisation/theory/applied-music
  contexts.
- Intervention: tool assigned as a supplemental practice resource.
- Measures:
  - Pre-survey.
  - Short weekly practice reflection.
  - Optional tool-use checklist.
  - Post-survey.
  - Faculty interview.
  - Optional pre/post recording on a short, faculty-selected scale/pattern task.

This produces usable evidence without overclaiming. It can support a classroom
technology paper and also guide improvements before a larger controlled study.

### Participant Population

Possible participants:

- Undergraduate jazz students.
- Students in improvisation, jazz theory, applied jazz lessons, piano skills, or
  ensemble-adjacent coursework.
- Faculty teaching or supervising jazz practice.

Inclusion criteria:

- Enrolled in a relevant course or studio.
- At least 18 years old, unless the IRB approves a minor-participant process.
- Willing to use a browser-based practice tool.

Exclusion criteria:

- Students who do not consent to research data collection. They should still be
  able to use the tool if it is part of normal instruction, but their data should
  not be included.

### Intervention

Suggested assignment:

- Students practice with the tool 3 times per week for 10-15 minutes per session
  over 4 weeks.
- Faculty select a bounded set of scales and keys, such as:
  - Major/Ionian and Dorian in 3-4 keys.
  - Melodic minor and altered scale for advanced students.
  - Steps, thirds, and fourths interval patterns.
- Students may use any instrument sound, tempo, octave, and feel settings, but
  should record which settings were useful.

### Data to Collect

Low-risk data:

- Pre-survey and post-survey responses.
- Weekly practice reflections.
- Faculty interview notes or recordings.
- Optional anonymized screenshots or settings checklists.

Potentially sensitive data:

- Student performance recordings.
- Course grades.
- Identifiable app telemetry.

Recommendation:

- Avoid grades as research data unless there is a strong reason.
- Avoid collecting identifiable telemetry in the first study.
- If recordings are collected, store them securely and separate identifiers from
  evaluation data.

### Example Pre-Survey Items

Use 5-point Likert items plus a few open-ended prompts.

Likert items:

- I regularly practice scales in all keys.
- I regularly practice scales using interval patterns such as thirds or fourths.
- I am comfortable reading scale notation in unfamiliar keys.
- I use audio playback or recordings to support scale practice.
- I feel confident choosing appropriate scale material for jazz practice.

Open-ended prompts:

- What scale or mode practice feels hardest right now?
- What tools or materials do you currently use for scale practice?
- What would make scale practice more useful or engaging?

### Example Post-Survey Items

Likert items:

- The tool was easy to use.
- Seeing notation and hearing playback together helped my practice.
- The interval-pattern options helped me practice beyond running scales.
- The tempo, feel, and instrument controls were useful.
- I practiced in more keys than I otherwise would have.
- I would use this tool again for independent practice.
- I would recommend this tool to another student.

Open-ended prompts:

- Which feature was most useful?
- Which feature was confusing or unnecessary?
- Did the tool change how you practiced? If so, how?
- What should be improved before this is used in more classes?

### Example Weekly Reflection

Keep this short so students actually complete it.

- Which scales/keys did you practice this week?
- Which interval pattern did you use most?
- Did you use playback? If yes, how?
- What felt easier by the end of the week?
- What still felt difficult?

### Faculty Interview Prompts

- Where did the tool fit naturally into your teaching?
- Which students seemed to benefit most?
- Which musical concepts did the tool support well?
- Which aspects did not align with your pedagogy?
- Did the generated notation match your expectations?
- What would need to change before using it regularly?
- Would printable charts, the web app, or both be most useful in your teaching?

### Optional Performance Assessment

If faculty are prepared to evaluate recordings, use short tasks to keep scoring
manageable.

Example pre/post task:

- Student records a faculty-selected scale in two keys at a comfortable tempo.
- Student records the same scale in thirds or fourths in one key.
- Student optionally records a short improvised phrase using the target scale.

Suggested rubric:

| Dimension | 1 | 3 | 5 |
| --- | --- | --- | --- |
| Pitch accuracy | frequent errors | mostly accurate | accurate and secure |
| Rhythmic steadiness | unstable | mostly steady | steady |
| Pattern fluency | frequent hesitations | some hesitations | fluent |
| Key fluency | key center unclear | mostly secure | secure across task |
| Musical application | mechanical only | some musical shape | musical and intentional |

### IRB / Ethics Notes

Issues to discuss with the IRB office:

- Whether the study qualifies as exempt educational research.
- Whether the instructor is also a researcher, which can create consent pressure.
- How consent will be collected without affecting grades or instructor
  relationships.
- Whether performance recordings are identifiable data.
- Whether minors could be present in any class or ensemble context.
- Where recordings and survey data will be stored.
- Whether students can opt out of research while still receiving normal course
  instruction and access to the tool.

Recommended safeguards:

- Use a neutral person to collect consent where possible.
- Make participation voluntary and unrelated to grades.
- De-identify survey responses before analysis.
- Store recordings in institution-approved storage.
- Report aggregate data and anonymized quotes only.

### Analysis Plan

Quantitative:

- Summarize Likert items with medians and distributions.
- Compare pre/post survey items descriptively.
- If sample size is adequate, use paired nonparametric tests for pre/post items.
- For rubric scores, report descriptive changes and inter-rater agreement if
  multiple raters score recordings.

Qualitative:

- Thematically code open-ended student responses and faculty interviews.
- Expected themes: usability, motivation, notation/audio alignment, practicing
  across keys, interval practice, mobile/offline access, and desired features.
- Use representative anonymized quotes.

### Minimal Dataset for a Publishable First Study

- 10-25 students.
- 1-3 jazz faculty.
- Pre/post surveys.
- Weekly reflections for 3-4 weeks.
- Faculty interviews.
- Optional 5-10 student recordings if feasible.

This would likely support an early classroom-technology paper if the claims are
kept modest.

## Best-Fit Venues

### 1. ICMC: International Computer Music Conference

Best if the paper emphasizes computational music, notation generation, Abjad /
LilyPond, MIDI/WAV/PDF generation, and the web practice system as a computer
music artifact.

Why it fits:

- Computer music and multimedia scope.
- Welcomes full and short papers.
- Natural audience for computational music systems and reproducible music tools.

2026 status:

- ICMC Hamburg 2026 submission deadline was January 4, 2026 AoE.
- Conference: May 10-16, 2026, Hamburg.
- 2027 CFP: not found yet; track when ICMA announces the next ICMC.

Source: <https://easychair.org/cfp/icmc2026>

### 2. NIME: New Interfaces for Musical Expression

Best if the paper emphasizes the musician-facing interface: notation, playback,
instrument choice, swing feel, interval practice, highlighting, installability,
and mobile/offline use.

Why it fits:

- NIME focuses on musical interface design and performance/expression systems.
- The web app can be framed as an interface for practice, exploration, and
  embodied learning.

2026 status:

- Titles/abstracts/authors due: February 5, 2026 AoE.
- Final paper/music submissions due: February 12, 2026 AoE.
- Workshops, alt.nime, and Student Consortium due: March 5, 2026 AoE.
- Conference: June 23-26, 2026, London.
- 2027 CFP: not found yet.

Source: <https://nime2026.org/>

### 3. AIMC: Conference on AI Music Creativity

Best if the paper foregrounds AI-assisted software engineering, computational
creativity, human-AI collaboration, and tool building for music learning.

Why it fits:

- AIMC welcomes papers, musical works, tutorials, and workshops relevant to AI
  music creativity.
- The paper can focus on what AI helped build, what remained human musical
  judgment, and how the system supports musical creativity/practice.

2026 status:

- Abstract deadline: April 18, 2026, extended.
- Full paper / music / tutorial submission deadline: May 2, 2026, extended.
- Notifications: July 7, 2026.
- Camera-ready deadline: August 15, 2026.
- 2027 CFP: not found yet; AIMC 2027 hosting was still being solicited in the
  2026 cycle.

Source: <https://aimc2026.org/home>

### 4. ISMIR: International Society for Music Information Retrieval

Best only if the paper leans into symbolic music data and computational music
analysis: scale representations, generated data contracts, pitch-class modeling,
computational generation, and evaluation of symbolic musical material.

Why it fits:

- ISMIR welcomes work on MIR applications including computational music analysis,
  processing, generation, algorithms, and evaluation.
- A pure tool paper may be too applied unless it includes a strong MIR or symbolic
  data contribution.

2026 status:

- Paper submission portal opened: February 19, 2026.
- Abstract due: April 20, 2026 AoE.
- Full paper due: April 27, 2026 AoE.
- Notification: July 10, 2026.
- Camera-ready: July 31, 2026.
- Conference: November 8-12, 2026, Abu Dhabi.
- 2027 CFP: not found yet.

Source: <https://ismir2026.ismir.net/authors/call-for-papers>

### 5. Music Encoding Conference / Music Encoding Initiative

Best if the paper focuses on symbolic representation and publication pipelines:
encoding music-theory knowledge, LilyPond/Abjad output, reproducible notation,
and transformation into web-consumable data.

Why it fits:

- The Music Encoding Conference brings together music encoding, musicology,
  analysis, library, and technology communities.
- This project is not MEI-based, so the paper must be framed as adjacent to music
  representation and encoding practice, not as an MEI contribution.

2026 status:

- 2026 proposal deadline found in MEI news as November 28, 2025.
- Conference: May 26-29, 2026, Tokyo.
- 2027 CFP: not found yet.

Sources:

- <https://music-encoding.org/conference/2026/>
- <https://music-encoding.org/community/news-events.html>

### 6. ACM Creativity & Cognition

Best if the paper frames the system as a creativity-support tool: helping
musicians explore, hear, and practice structured musical material through an
interactive system.

Why it fits:

- Creativity & Cognition welcomes work on interactive systems, creativity-support
  environments, and reflective accounts of creative practice.
- The paper should emphasize design rationale, use, and creative/pedagogical
  support rather than only implementation.

2026 status:

- Papers/pictorials/artworks abstract/metadata due: January 29, 2026 AoE.
- Full submission due: February 5, 2026 AoE.
- Posters and technical demonstrations due: April 16, 2026 AoE.
- Conference: July 13-16, 2026, London.
- 2027 CFP: not found yet.

Source: <https://cc.acm.org/2026/>

### 7. SIGCSE Technical Symposium

Best if the paper is about computing education: using the project to teach
software engineering, generated artifacts, type-aware modeling, CI/CD, web audio,
or AI-assisted development in a music domain.

Why it fits:

- SIGCSE welcomes educational research projects, classroom experiences, teaching
  techniques, curricular initiatives, and pedagogical tools in computing.
- This is less a music venue and more a venue for the CS/software-engineering
  teaching story.

2027 status:

- Paper abstracts due: June 26, 2026 AoE.
- Full papers and several round-one categories due: July 3, 2026 AoE.
- Other categories due later, including September 30, 2026 for demos/posters and
  related formats according to public CFP summaries.
- Conference: February 17-20, 2027, Sacramento.

Sources:

- <https://2027.sigcse-ts.acm.org/track/sigcse-ts-2027-Papers-1>
- <https://www.sigcse.org/>

### 8. CSEDU / Computer Supported Education

Best if the paper becomes educational technology research: an advanced prototype
for music practice, with user feedback or an educational case study.

Why it fits:

- CSEDU seeks educational technology research, case studies, advanced prototypes,
  systems, tools, and techniques.
- There has also been a Computer Supported Music Education special session in
  recent CSEDU editions.

2026 status:

- CSME 2026 special-session submission deadline found as March 23, 2026.

2027 status:

- Regular paper deadline: November 17, 2026.
- Position/regular paper deadline: December 21, 2026.
- Workshop and special-session proposals: November 27, 2026.
- Conference: April 16-18, 2027, Rome.

Sources:

- <https://csedu.scitevents.org/ImportantDates.aspx>
- <https://societymusictheory.org/events/8th-international-conference-computer-supported-education-csedu-2026-special-session>

### 9. ICSE SEET: Software Engineering Education and Training

Best if the paper is primarily about software engineering education or practice:
using the project as a case study in AI-assisted development, reproducible
artifact pipelines, CI/CD, generated media, and domain-driven modeling.

Why it fits:

- ICSE is the premier software-engineering venue; SEET specifically targets
  software engineering education and training.
- A general ICSE research-track paper would need a stronger empirical SE
  contribution than the current artifact likely has, but SEET could fit a
  teaching/case-study framing.

2027 status:

- ICSE research-track abstract deadline: June 23, 2026.
- ICSE research-track full submission deadline: June 30, 2026.
- SEET submission deadline: October 23, 2026 AoE.
- SEET notification: December 18, 2026.
- SEET camera-ready: January 19, 2027.
- Conference: April 25-May 1, 2027, Dublin.

Sources:

- <https://conf.researchr.org/track/icse-2027/icse-2027-research-track>
- <https://conf.researchr.org/track/icse-2027/icse-2027-software-engineering-education-and-training--seet->

## Practical Target Ranking

Most natural first targets:

1. ICMC, if the artifact/system and computer-music pipeline are the center.
2. NIME, if the interaction and practice experience are the center.
3. AIMC, if AI-assisted creation/development is the center.
4. CSEDU or SIGCSE, if the education angle becomes primary.
5. ICSE SEET, if the paper becomes a software-engineering education case study.

## Deadline Snapshot

As of July 7, 2026:

| Venue | Best framing | Next known submission deadline | Status |
| --- | --- | --- | --- |
| ICMC 2026 | Computer music system / reproducible notation pipeline | January 4, 2026 | Passed |
| NIME 2026 | Interactive musical practice interface | February 5 and February 12, 2026 | Passed |
| AIMC 2026 | AI music creativity / AI-assisted development | April 18 and May 2, 2026 | Passed |
| ISMIR 2026 | Symbolic music data / computational analysis | April 20 and April 27, 2026 | Passed |
| Music Encoding Conference 2026 | Symbolic representation / encoding pipeline | November 28, 2025 | Passed |
| ACM Creativity & Cognition 2026 | Creativity-support system | January 29 and February 5, 2026; demos April 16, 2026 | Passed |
| SIGCSE TS 2027 | Computing education / pedagogical tool | June 26 and July 3, 2026 | Passed as of today in most US time zones; verify AoE if acting immediately |
| CSEDU 2027 | Educational technology / music-learning prototype | November 17, 2026; December 21, 2026 | Open/upcoming |
| ICSE SEET 2027 | Software-engineering education case study | October 23, 2026 | Open/upcoming |

## Immediate Recommendation

For a timely paper from this project, the most practical remaining 2027 deadlines
are:

- CSEDU 2027, if a music-learning technology paper can be drafted by November
  2026.
- ICSE SEET 2027, if the paper becomes a software-engineering education or
  AI-assisted software-development case study by October 2026.
- The 2027 cycles for ICMC, NIME, AIMC, ISMIR, Music Encoding Conference, and ACM
  Creativity & Cognition should be monitored as soon as their CFPs are posted.

## Possible Paper Outline

1. Introduction: why jazz practice material generation is a computational music
   and software-engineering problem.
2. Related work: computer music systems, symbolic music representation, music
   education tools, AI-assisted software engineering.
3. System architecture: Python model, Abjad/LilyPond pipeline, JSON contract, web
   renderer/player, PWA/offline support, CI.
4. Music-theory model: pitch classes, enharmonic spelling, scale definitions,
   interval labels, key cycles.
5. Generated artifacts: PDFs, MIDI, WAV, merged book, slide/demo assets, web app.
6. Interactive practice design: notation, playback, swing feel, interval
   patterns, highlighting, instruments, mobile/offline design.
7. AI-assisted engineering process: where AI helped, review/verification
   practices, failure modes, and why the model remains human-auditable.
8. Evaluation: correctness checks, musician feedback, build reproducibility, and
   limitations.
9. Discussion: lessons for computational music systems and educational software.
10. Conclusion and future work.
