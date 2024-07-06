import { create } from "zustand";

const colorPalette = [
  "#3c63ea",
  "#3debd6",
  "#eb3ea6",
  "#f5dddd",
  "#fbb13c",
  "#ffb4a2",
];

export const useAppStore = create((set) => ({
  currentUser: {
    name: "John Doe",
  },
  people: [
    {
      name: "Vira",
      outlineColor: colorPalette[0],
    },
    {
      name: "Nata",
      outlineColor: colorPalette[1],
    },
    {
      name: "Jane Doe",
      outlineColor: colorPalette[2],
    },
  ],
}));
