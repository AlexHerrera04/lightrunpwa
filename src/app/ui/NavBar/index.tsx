import React from 'react';
import {
  Navbar,
  Typography,
  Button,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
  Avatar,
  IconButton,
  Collapse,
} from '@material-tailwind/react';
import {
  ChevronDownIcon,
  PowerIcon,
  Bars2Icon,
  UserIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../auth/provider/authProvider';
import { useQuery } from '@tanstack/react-query';
import wikiProfilePic from '../../../assets/images/wiki-profile-pic.webp';
import { useUser } from '../../core/feature-user/provider/userProvider';
import { capitalize, isEmpty } from 'lodash';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import WikiLogo from '/src/assets/images/wiki-logo2.svg';
import api from 'src/app/core/api/apiProvider';
import { access } from 'fs';
import path from 'path';

const ROUTES = [
  {
    path: '/home',
    name: 'Inicio',
    access: ['company'],
  },
  {
    path: '/explorer',
    name: 'Explorador',
    access: ['company'],
  },
  {
    path: '/diagnosticador',
    name: 'Diagnosticador',
    access: ['company'],
  },
  {
    path: '/content',
    name: 'Colaborador',
    access: ['company', 'expert'],
  },
  // {
  //   path: '/history',
  //   name: 'Historial',
  //   access: ['company'],
  // },
  {
    path: '/contributor',
    name: 'Contribuidor',
    access: ['company'],
  },
  {
    path: '/admin',
    name: 'Administrador',
    access: ['company'],
    requiresAdmin: true
  }
];

function ProfileMenu({ data }: any) {
  const { logout } = useAuth();
  const { setUserInfo, setUserAccountInfo } = useUser();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const closeMenu = () => setIsMenuOpen(false);
  const navigate = useNavigate();

  const onHover = () => setHover(true);
  const onLeave = () => setHover(false);

  const handleLogout = React.useCallback(() => {
    closeMenu();
    setUserInfo(null);
    setUserAccountInfo(null);
    logout();
  }, []);

  const goToProfile = React.useCallback(() => {
    navigate('/profile');
    closeMenu();
  }, []);

  const goToHistory = React.useCallback(() => {
    navigate('/history');
    closeMenu();
  }, []);


  if (!data) return null;

  return (
    <Menu open={isMenuOpen} handler={setIsMenuOpen} placement="bottom-end">
      <MenuHandler>
        <Button
          variant="text"
          color="blue-gray"
          className="flex items-center gap-1 rounded-full py-0 pr-2 pl-0.5 lg:ml-auto dark:bg-dark-600"
          onMouseEnter={onHover}
          onMouseLeave={onLeave}
        >
          <div className="flex items-center gap-4 inset-0 group-hover:opacity-50">
            <Avatar
              variant="circular"
              alt="Raphael Moraes"
              className="border h-10 w-10"
              src={wikiProfilePic}
            />
            {/*<div className="flex flex-col transition-all">
              <Typography variant="h6" className="dark:text-gray-50">
                {data?.username}
              </Typography>
              <Typography
                variant="small"
                color="gray"
                className="capitalize font-bold dark:text-gray-500"
              >
                {data?.first_name} {data?.last_name}
              </Typography>
  </div>*/}
          </div>

          <ChevronDownIcon
            strokeWidth={2.5}
            className={`h-3 w-3 transition-transform ${
              isMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </Button>
      </MenuHandler>
      <MenuList className="p-1 dark:bg-dark-600">
        <MenuItem
          key="profile"
          onClick={goToProfile}
          className="flex items-center gap-2 rounded "
        >
          {React.createElement(UserIcon, {
            className: `h-4 w-4`,
            strokeWidth: 2,
          })}
          <Typography as="span" variant="small" className="font-normal">
            Perfil
          </Typography>
        </MenuItem>
        <MenuItem
          key="history"
          onClick={goToHistory}
          className="flex items-center gap-2 rounded "
        >
          {React.createElement(ClockIcon, {
            className: `h-4 w-4`,
            strokeWidth: 2,
          })}
          <Typography as="span" variant="small" className="font-normal">
            Historial
          </Typography>
        </MenuItem>
        <MenuItem
          key="signout"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded hover:bg-red-500/10 focus:bg-red-500/10 active:bg-red-500/10"
        >
          {React.createElement(PowerIcon, {
            className: `h-4 w-4 text-red-500`,
            strokeWidth: 2,
          })}
          <Typography
            as="span"
            variant="small"
            className="font-normal"
            color="red"
          >
            Cerrar sesión
          </Typography>
        </MenuItem>
      </MenuList>
    </Menu>
  );
}

async function queryUserInfo(token: string | null) {
  if (!token) return null;

  const { data } = await api.get(
    `${import.meta.env.VITE_API_URL}/accounts/userinfo`
  );

  return data;
}

async function queryUserAccountInfo(userID: string | null) {
  if (!userID) return null;

  const { data } = await api.get(
    `${import.meta.env.VITE_API_URL}/accounts/accountinfo/${userID}`
  );

  return data;
}

export default function ComplexNavbar({ children }: any) {
  const [isNavOpen, setIsNavOpen] = React.useState(false);
  const toggleIsNavOpen = () => setIsNavOpen((cur) => !cur);
  const { token } = useAuth();
  const { setUserInfo, setUserAccountInfo, userInfo, userAccountInfo } =
    useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: localUserInfo } = useQuery({
    queryKey: ['userInfo', token],
    enabled: !!token,
    queryFn: () => queryUserInfo(token),
  });

  const userID = localUserInfo?.id;

  const { data: localUserAccountInfo } = useQuery({
    queryKey: ['userAccountInfo', userID, userAccountInfo],
    enabled: !!userID && isEmpty(userAccountInfo),
    queryFn: () => queryUserAccountInfo(userID),
  });

  React.useEffect(() => {
    window.addEventListener(
      'resize',
      () => window.innerWidth >= 960 && setIsNavOpen(false)
    );
  }, []);

  React.useEffect(() => {
    if (localUserInfo) {
      setUserInfo(localUserInfo);
    }
  }, [localUserInfo]);

  React.useEffect(() => {
    if (localUserAccountInfo) {
      setUserAccountInfo(localUserAccountInfo);
      if (
        localUserAccountInfo.type === 'expert' &&
        !location.pathname.includes('/content')
      ) {
        navigate('/content');
      }
    }
  }, [localUserAccountInfo]);

  const isCurrentPage = (href: string) => {
    return location.pathname.includes(href);
  };

  const navList = (
    <ul className="mb-4 mt-2 flex flex-col gap-6  lg:mb-0 lg:mt-0 lg:flex-row lg:items-center">
      {ROUTES.map((item: any, i) => {
        return item.access.includes(userAccountInfo?.type) && 
        (!item.requiresAdmin || (userAccountInfo?.is_account_admin || userAccountInfo?.is_manager)) ? (
          <Typography
            key={i}
            as="li"
            variant="small"
            className={
              isCurrentPage(item)
                ? 'font-bold text-lg'
                : 'font-normal text-lg opacity-60'
            }
          >
            <Link to={item.path} className="flex items-center">
              {item.name}
            </Link>
          </Typography>
        ) : (
          ''
        );
      })}
    </ul>
  );

  return (
    <>
      <Navbar
        shadow={false}
        className="sticky inset-0 z-10 h-17 max-w-full rounded-none py-2 px-4 lg:px-8 lg:py-6 bg-opacity-100 dark:bg-dark-600 dark:backdrop-blur-0 dark:border-b-white/10 border-t-0 border-r-0 border-l-0"
      >
        <div className="relative mx-auto flex items-center text-secondary-500">
          <Link to="/home">
            <img src={WikiLogo} width={100} alt="" />
          </Link>

          <div className="hidden lg:block ml-10">{navList}</div>
          <div className="flex items-center gap-2 ml-auto">
            {userInfo && (
              <div className="">
                <ProfileMenu data={userInfo} />
              </div>
            )}
          </div>

          <IconButton
            size="lg"
            variant="text"
            onClick={toggleIsNavOpen}
            className="ml-auto mr-2 lg:hidden dark:text-gray-50"
          >
            <Bars2Icon className="h-6 w-6 dark:text-gray-50" />
          </IconButton>
        </div>
        <Collapse open={isNavOpen}>
          <div className="container mx-auto">{navList}</div>
        </Collapse>
      </Navbar>
      {children}
    </>
  );
}
