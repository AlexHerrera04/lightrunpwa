import React, { useState } from 'react';
import withNavbar from '../../core/handlers/withNavbar';

import UserTable from '../components/User';
import Goals from '../components/Goals';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  useOrganizations,
  useDeleteOrganization,
} from '../services/organizationService';
import Organization from '../components/Organization';
import { OrganizationType, User } from '../types/organization';

import organizationIcon from '../../../assets/icons/organization-admin.svg';
import userIcon from '../../../assets/icons/user-admin.svg';
import metricIcon from '../../../assets/icons/metric.svg';
import goalsIcon from '../../../assets/icons/goals-admin.svg';

import { useUser } from '../../core/feature-user/provider/userProvider';
import { useGroupUsers } from '../services/userService';
import { Spinner } from '@material-tailwind/react';
import { toast } from 'react-toastify';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import ReportTable from '../components/Reports';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(() => {
    const lastTab = localStorage.getItem('lastTab');
    localStorage.removeItem('lastTab'); // Limpiar después de usar
    return lastTab || 'Usuarios';
  });
  const [searchTerm, setSearchTerm] = useState('');

  const { userInfo } = useUser();
  const { organizations, isLoading: orgsLoading } = useOrganizations();

  // Usar el group_id real del usuario
  const userGroupId = userInfo?.group_id || '';
  const userRole = 'ADMIN'; // Esto debería venir de algún lugar

  const {
    data: users = [],
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useGroupUsers();

  const deleteOrganizationMutation = useDeleteOrganization();

  const data = [
    {
      label: 'Usuarios',
      value: 'Usuarios',
      icon: userIcon,
    },
    {
      label: 'Metas',
      value: 'Metas',
      icon: goalsIcon,
    },
    {
      label: 'Organización',
      value: 'Organización',
      icon: organizationIcon,
    },
    {
      label: 'Informes',
      value: 'Informes',
      icon: metricIcon,
    },
  ];

  const handleDelete = async (id: string) => {
    try {
      await deleteOrganizationMutation.mutateAsync(id);
      refetchUsers();
    } catch (error) {
      setError('Error deleting organization');
      console.error('Error:', error);
    }
  };

  const handleEdit = (org: OrganizationType) => {
    navigate('/admin/organization', {
      state: { editMode: true, orgToEdit: org },
    });
  };

  const renderList = (value: string) => {
    switch (value) {
      case 'Organización':
        return (
          <Organization
            searchTerm={searchTerm}
            organizations={organizations || []}
            users={users}
            userRole={userRole}
            userGroupId={userGroupId}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        );
      case 'Usuarios':
        return <UserTable searchTerm={searchTerm.toLowerCase()} />;
      case 'Informes':
        return <ReportTable searchTerm={searchTerm}/>;
      case 'Metas':
        return <Goals searchTerm={searchTerm} />;
      default:
        return <UserTable searchTerm={searchTerm.toLowerCase()} />;
    }
  };

  const content = (
    <div className="mx-auto w-full">
      <div className="flex flex-col">
        <div className="flex items-center justify-center mt-6 sticky top-0 bg-[#0f172a] p-4">
          {/* Tabs personalizados primero */}
          <div className="flex gap-8">
            {data.map(({ label, value, icon }) => (
              <button
                key={value}
                onClick={() => {
                  setActiveTab(value);
                  setSearchTerm('');
                }}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  activeTab === value
                    ? 'text-white'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <img src={icon} className="w-10 h-10" alt={label} />
                </div>
                <span className="text-base">{label}</span>
              </button>
            ))}
          </div>

          {/* Buscador y botón de agregar */}
          <div className="flex items-center ml-14 gap-11">
            <div className="relative w-96">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                className="w-full pl-10 px-4 py-2 bg-[#1e2633] text-white rounded-lg border border-gray-600 focus:border-primary-900 focus:ring-2 focus:ring-primary-900 focus:outline-none"
                placeholder={`Buscar ${
                  activeTab === 'Organización'
                    ? 'Organizaciones'
                    : activeTab === 'Metas'
                    ? 'Metas'
                    : activeTab === 'Usuarios'
                    ? 'Usuarios'
                    : 'Informes'
                }...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={() => {
                if (activeTab === 'Usuarios') {
                  toast('Funcionalidad no disponible');
                } else if (activeTab === 'Organización') {
                  navigate('/admin/organization');
                } else if (activeTab === 'Metas') {
                  navigate('/admin/goals');
                } else if (activeTab === 'Informes') {
                  toast('Funcionalidad en desarrollo');
                }
              }}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors w-72"
            >
              <PlusIcon className="h-5 w-5" />
              <span>
                Agregar{' '}
                {activeTab === 'Organización'
                  ? 'Organización'
                  : activeTab === 'Usuarios'
                  ? 'Usuario'
                  : activeTab}
              </span>
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="mt-4 px-4">{renderList(activeTab)}</div>
      </div>
      {orgsLoading && (
        <div className="text-center p-4">
          <Spinner />
        </div>
      )}
    </div>
  );

  return withNavbar({ children: content });
};

export default Admin;