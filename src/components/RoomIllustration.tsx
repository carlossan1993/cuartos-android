// Decorative plan illustration; the editable geometry arrives in later stages.
export function RoomIllustration() {
  return (
    <svg className="room-illustration" viewBox="0 0 560 390" aria-hidden="true">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#e4e6dc" strokeWidth="0.7" />
        </pattern>
      </defs>
      <rect x="16" y="16" width="528" height="358" rx="20" fill="url(#grid)" />
      <path d="M117 76H431V314H292M117 76V314H235" fill="#f7f5ed" stroke="#43584a" strokeWidth="8" strokeLinejoin="round" />
      <path d="M235 314V257a57 57 0 0 1 57 57" fill="none" stroke="#687d6e" strokeWidth="2" />
      <path d="M200 76h95" stroke="#f7f5ed" strokeWidth="10" />
      <path d="M200 72h95m-95 8h95m-47-8v8" stroke="#72948b" strokeWidth="2" />
      <rect x="144" y="111" width="126" height="165" rx="6" fill="#e4dac7" stroke="#968873" strokeWidth="2" />
      <rect x="151" y="119" width="112" height="38" rx="6" fill="#faf8f2" stroke="#b9af9d" />
      <path d="M207 121v33" stroke="#c9bda8" />
      <rect x="144" y="164" width="126" height="112" rx="5" fill="#8d9b7c" />
      <path d="M150 175h114m-114 8h114" stroke="#d7deca" strokeWidth="2" />
      <rect x="286" y="112" width="30" height="36" rx="3" fill="#dac09b" stroke="#ac9068" />
      <circle cx="301" cy="128" r="9" fill="#f7f4e9" />
      <rect x="366" y="105" width="42" height="126" rx="4" fill="#e8dfcf" stroke="#b7a68b" strokeWidth="2" />
      <path d="M370 168h34" stroke="#b7a68b" />
      <rect x="337" y="256" width="68" height="35" rx="3" fill="#d4b697" stroke="#a88c6e" />
      <rect x="358" y="232" width="25" height="28" rx="8" fill="#e9dfd0" stroke="#b7a68b" />
      <circle cx="322" cy="278" r="14" fill="#b8c2a1" />
      <path d="M316 278q15-20 15 1m-9 10v-19" fill="none" stroke="#6b805d" strokeWidth="2" />
      <path d="M117 48H431m-314-6v12m314-12v12M88 76V314m-6-238h12m-12 238h12" fill="none" stroke="#929d8c" strokeWidth="1.3" />
      <circle cx="431" cy="314" r="4" fill="#b57252" />
    </svg>
  )
}
