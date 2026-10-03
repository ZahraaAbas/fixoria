// خلفية محيطة ثابتة: كرات ضوء ناعمة من لوحة الهوية تتحرك ببطء شديد.
// الحركة CSS فقط (بلا JS)، وتتوقف تلقائيًا مع prefers-reduced-motion.
function AmbientBackground() {
  return (
    <div className="fx-ambient" aria-hidden="true">
      <span className="fx-ambient__orb fx-ambient__orb--a" />
      <span className="fx-ambient__orb fx-ambient__orb--b" />
      <span className="fx-ambient__orb fx-ambient__orb--c" />
    </div>
  )
}

export default AmbientBackground
