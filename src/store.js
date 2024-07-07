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
    avatarUrl: "https://ntrepidcorp.com/wp-content/uploads/2016/06/team-1.jpg"
  },
  people: [
    {
      name: "Vira",
      avatarUrl: "https://pbs.twimg.com/profile_images/1507756920299524103/pCFSMHe3_400x400.jpg",
      outlineColor: colorPalette[0],
    },
    {
      name: "Nata",
      outlineColor: colorPalette[1],
    },
    {
      name: "Roman Callback",
      avatarUrl: "https://s.dou.ua/img/avatars/200x200_74503.jpg",
      outlineColor: colorPalette[2],
    }
  ],
}));
