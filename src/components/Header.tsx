import searchIcon from "../assets/search-icon.svg";

import { Dropdown, Space, Avatar } from "antd";
import { DownOutlined, SmileOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";

const colorPalette = [
  "#3c63ea", "#3debd6", "#eb3ea6", "#f5dddd", "#fbb13c", "#ffb4a2",
]

const items: MenuProps["items"] = [
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

const people = [
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
];

function getInitials(fullName: String) {
  let nameParts = fullName.trim().split(' ');
  let initials = nameParts.map((part: String) => part.charAt(0).toUpperCase()).join('');
  return initials;
}


export function Header({ currentUser }: { currentUser: { name: string } }) {
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
            <Avatar style={{ backgroundColor: "gray"}} size="large">
              <PlusOutlined />
            </Avatar>
          </a>
        </div>

        {people.map(person =>
          <div className="nav-item person-item">
            <a href="#" title={person.name}>
              <Avatar style={{ backgroundColor: person.outlineColor }} size="large">
                {getInitials(person.name)}
              </Avatar>
            </a>
          </div>
        )}
        <div className="nav-item profile-menu">
          <Dropdown menu={{ items }} trigger={["click"]}>
            <a onClick={(e) => e.preventDefault()} className="profile-menu-trigger">
              <Space className={"profile-menu-space"}>
                <Avatar icon={<UserOutlined />} />
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
