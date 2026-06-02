export type StyleCatalogItem = {
  id: string;
  title: string;
  previewImage: string;
};

export const styleCatalog: StyleCatalogItem[] = [
  {
    id: "anime-force",
    title: "Аниме",
    previewImage: "/style-previews/anime-stars.jpg",
  },
  {
    id: "dreamworks-command",
    title: "Вальехо",
    previewImage: "/style-previews/vallejo.jpg",
  },
  {
    id: "field-glam",
    title: "Doll",
    previewImage: "/style-previews/doll.jpg",
  },
];
