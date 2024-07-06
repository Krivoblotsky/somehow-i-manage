import { useAppStore } from "../store";
import searchIcon from "../assets/search-icon.svg";

import { Dropdown, Space, Avatar } from "antd";
import { DownOutlined, PlusOutlined } from "@ant-design/icons";

const items = [
  {
    key: "1",
    label: (
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://www.antgroup.com"
      >
        Settings
      </a>
    ),
  },
  {
    key: "2",
    label: (
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://www.antgroup.com"
      >
        Logout
      </a>
    ),
  },
];

function getInitials(fullName) {
  const nameParts = fullName.trim().split(" ");
  const initials = nameParts
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return initials;
}

export function Header() {
  const currentUser = useAppStore((store) => store.currentUser);
  const people = useAppStore((store) => store.people);
  return (
    <div className="header">
      <a href="#" className="app-title">
        Personal
      </a>
      <nav className="nav">
        <div className="nav-item search-input">
          <img src={searchIcon} />
          <input type="text" placeholder="Search" />
        </div>
        <div className="nav-item person-item">
          <a href="#" title="Click to add a person">
            <Avatar style={{ backgroundColor: "gray" }} size="large">
              <PlusOutlined />
            </Avatar>
          </a>
        </div>

        {people.map((person, i) => (
          <div className="nav-item person-item" key={i}>
            <a href="#" title={person.name}>
              <Avatar
                style={{ backgroundColor: person.outlineColor }}
                size="large"
                src={person.avatarUrl}
              >
                {getInitials(person.name)}
              </Avatar>
            </a>
          </div>
        ))}
        <div className="nav-item profile-menu">
          <Dropdown menu={{ items }} trigger={["click"]}>
            <a
              onClick={(e) => e.preventDefault()}
              className="profile-menu-trigger"
            >
              <Space className={"profile-menu-space"}>
                <Avatar src={currentUser.avatarUrl} />
                {currentUser.name}
                <DownOutlined />
              </Space>
            </a>
          </Dropdown>
        </div>
      </nav>
    </div>
  );
}
