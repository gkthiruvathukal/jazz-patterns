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
      c8^\markup \bold "C Minor Pentatonic ♭5"
      ees8_\markup \tiny "m3"
      f8_\markup \tiny "W"
      ges8_\markup \tiny "H"
      bes8_\markup \tiny "M3"
      c8_\markup \tiny "W"
    }
  }
  \layout { }
}
