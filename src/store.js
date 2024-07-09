import { create } from "zustand";

const colorPalette = [
  "#3c63ea",
  "#3debd6",
  "#eb3ea6",
  "#f5dddd",
  "#fbb13c",
  "#ffb4a2",
];

const people = [
  {
    id: "person-1",
    name: "Vira",
    avatarUrl:
      "https://pbs.twimg.com/profile_images/1507756920299524103/pCFSMHe3_400x400.jpg",
    outlineColor: colorPalette[0],
    items: [
      {
        id: "vira-1",
        title: "Promotion Next Steps",
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        isComplete: false,
      },
      {
        id: "vira-2",
        title: "Buy Tickets",
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        isComplete: true,
      },
      {
        id: "vira-3",
        title: "Address Feedback",
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        isComplete: true,
      },
      {
        id: "vira-4",
        title: "Prepare slides",
        text: "Lorem ipsum dolor sit amet",
        isComplete: true,
      },
    ],
  },
  {
    id: "person-2",
    name: "Nata",
    outlineColor: colorPalette[1],
    items: [
      {
        id: "nata-1",
        title: "Prep Paper",
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        isComplete: false,
      },
    ],
  },
  {
    id: "person-3",
    name: "Roman Callback",
    avatarUrl: "https://s.dou.ua/img/avatars/200x200_74503.jpg",
    outlineColor: colorPalette[2],
    items: [],
  },
];

export const useAppStore = create((set) => ({
  currentUser: {
    name: "John Doe",
    avatarUrl: "https://ntrepidcorp.com/wp-content/uploads/2016/06/team-1.jpg",
  },
  people: people.reduce((acc, person) => {
    acc[person.id] = person;
    return acc;
  }, {}),
  updateItemText: (personId, itemId, newText) =>
    set((state) => {
      const newItems = state.people[personId].items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            text: newText,
          };
        }
        return item;
      });
      const updatedPerson = {
        ...state.people[personId],
        items: newItems,
      };
      return { people: { ...state.people, [personId]: updatedPerson } };
    }),
  toggleCompleteItem: (personId, itemId) =>
    set((state) => {
      const newItems = state.people[personId].items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            isComplete: !item.isComplete,
          };
        }
        return item;
      });
      const updatedPerson = {
        ...state.people[personId],
        items: newItems,
      };
      return { people: { ...state.people, [personId]: updatedPerson } };
    }),
}));
