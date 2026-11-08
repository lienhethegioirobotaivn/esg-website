import Image from "@tiptap/extension-image";

export const ImageBlock = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") ?? "center",
        renderHTML: (attributes) => ({ "data-align": attributes["align"] }),
      },
      width: {
        default: 100,
        parseHTML: (element) => Number(element.getAttribute("data-width")) || 100,
        renderHTML: (attributes) => ({
          "data-width": attributes["width"],
          style: `width:${attributes["width"]}%`,
        }),
      },
    };
  },
}).configure({ inline: false, allowBase64: false });
