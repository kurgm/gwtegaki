import FramedImage from "./FramedImage";

interface GlyphImageProps {
  name: string;
}

export default function GlyphImage({ name }: GlyphImageProps) {
  return (
    <FramedImage
      src={`https://glyphwiki.org/glyph/${name}.50px.png`}
      alt={name}
      title={name}
    />
  );
}
