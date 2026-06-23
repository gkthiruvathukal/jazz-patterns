\version "2.24.0"

\header { tagline = ##f }
\paper {
  indent = 0
  oddHeaderMarkup = ##f
  evenHeaderMarkup = ##f
  oddFooterMarkup = ##f
  evenFooterMarkup = ##f
}

\score {
  \new Staff \with { \omit TimeSignature } {
    \clef treble
    \relative c' {
      c8^\markup \bold "C Major — Cmaj7"
      d8_\markup \tiny "W"
      e8_\markup \tiny "W"
      f8_\markup \tiny "H"
      g8_\markup \tiny "W"
      a8_\markup \tiny "W"
      b8_\markup \tiny "W"
      c8_\markup \tiny "H"
    }
  }
  \layout { }
}
