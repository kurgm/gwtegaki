import style from "./GlyphImage.module.css";

interface GlyphImageProps {
  name: string;
}

export default function GlyphImage({ name }: GlyphImageProps) {
  return (
    <img
      className={style.image}
      src={`https://glyphwiki.org/glyph/${name}.50px.png`}
      alt={name}
      title={name}
    />
  );
}
