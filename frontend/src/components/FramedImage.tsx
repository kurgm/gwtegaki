import style from "./FramedImage.module.css";

export default function FramedImage(
  props: React.ComponentPropsWithoutRef<"img">
) {
  return (
    <img
      width="50"
      height="50"
      {...props}
      className={`${props.className ?? ""} ${style.image}`}
    />
  );
}
