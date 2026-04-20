import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  IconButton,
  Tooltip,
  Typography,
  Switch,
  Dialog,
  Button,
  Spinner
} from '@material-tailwind/react';
import {
  EyeIcon,
  PencilIcon,
  TagIcon,
  ExclamationCircleIcon,
  CpuChipIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import {
  GroupUser,
  useGroupUsers,
  useLayerZeroOptions,
  useUpdateUserCapacities,
} from '../services/userService';
import { SelectLine } from 'src/app/feature-content/components/ContentForm';
import { useFormik } from 'formik';
import { ViewUserModal } from './modals/ViewUserModal';
import { User } from '../types/user';
import { useCreateGoal, CreateGoalRequest } from '../services/goalService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../core/api/apiProvider';

interface UserTableProps {
  searchTerm: string;
}

interface Capacity {
  id: number;
  name: string;
}

const UserTable: React.FC<UserTableProps> = ({ searchTerm }) => {
  const { data: users = [], isLoading } = useGroupUsers();
  const { data: layerZeroOptions } = useLayerZeroOptions();
  const [selectedUser, setSelectedUser] = useState<GroupUser | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [showCapacitiesModal, setShowCapacitiesModal] = useState(false);
  const navigate = useNavigate();
  const createGoal = useCreateGoal();
  const updateCapacities = useUpdateUserCapacities();

  // Transform capacities data for SelectLine component
  const capacities =
    (layerZeroOptions?.capacities as unknown as Capacity[])?.map(
      (capacity) => ({
        value: capacity.id.toString(),
        label: capacity.name,
      })
    ) || [];

  const queryClient = useQueryClient()

  const formik = useFormik({
    initialValues: {
      capacities:
        selectedUser?.capacities?.map((id: any) => ({
          value: id.toString(),
          label:
            (layerZeroOptions?.capacities as unknown as Capacity[])?.find(
              (c) => c.id === Number(id)
            )?.name || id,
        })) || [],
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        // Extraer los nombres (labels) en lugar de los IDs
        const capacityNames = values.capacities.map((c: any) => c.label);

        console.log('Valores a enviar:', capacityNames); // Debug

        await updateCapacities.mutateAsync({
          userId: selectedUser?.id || 0,
          capacities: capacityNames,
        });

        queryClient.invalidateQueries(['userCapacities', selectedUser?.id]);

        setShowCapacitiesModal(false);
      } catch (error) {
        console.error('Error updating capacities:', error);
      }
    },
  });

  const isUserIncomplete = (user: User) => {
    return !user.has_account_info || !user.is_onboarded;
  };

  // Aplicar filtros
  const filteredUsers = users.filter((user: User) => {
    // Primero aplicar filtro de búsqueda
    const matchesSearch =
      !searchTerm ||
      [
        user.username,
        user.email,
        user.public_name,
        user.organization,
        user.id?.toString(),
      ].some((field) =>
        field?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    // Luego aplicar filtro de usuarios incompletos
    const matchesIncomplete = !showIncomplete || isUserIncomplete(user);

    return matchesSearch && matchesIncomplete;
  });

  const handleCreateGoal = async (userId: number) => {
    try {
      const goalData: CreateGoalRequest = {
        user: userId,
        name: 'Nueva Meta',
        expiration_date: '2024-12-31', // Fecha ejemplo
        content: 1, // ID del contenido
        priority: 'low',
      };

      await createGoal.mutateAsync(goalData);
      // Opcional: Refrescar datos o navegar
      navigate(`/admin/users/${userId}/goals`);
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleAssignGoal = (userId: number) => {
    // Navegar a la página de asignación de metas con el ID del usuario
    navigate(`/admin/goals/assign?userId=${userId}`);
  };

  const { data: userCapacities, isLoading: isLoadingCapacities } = useQuery({
    queryKey: ['userCapacities', selectedUser?.id],
    queryFn: () =>
      api
        .get(
          `${import.meta.env.VITE_API_URL}/accounts/accountinfo/${
            selectedUser?.id
          }/`
        )
        .then((res) => res.data),
    enabled: !!selectedUser?.id,
  });

  useEffect(() => {
    if (userCapacities?.capacity) {
      const formattedCapacities = userCapacities.capacity.map(
        (cap: string) => ({
          value: cap,
          label: cap,
        })
      );
      formik.setFieldValue('capacities', formattedCapacities);
    }

    return () => {
      formik.setFieldValue('capacities', []);
    }
  }, [userCapacities]);

  const handleViewCapacities = (user: GroupUser) => {
    setSelectedUser(user);
    setShowCapacitiesModal(true);
  };

  return (
    <Card className="h-full w-full bg-gray-800">
      <CardBody className="overflow-y-auto px-0">
        <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg mx-4 mt-4">
          <Typography
            variant="small"
            className="text-gray-300 italic text-center"
          >
            ⓘ Gestión de Usuarios con funcionalidad limitada en este MVP.
          </Typography>
        </div>

        {/* Filtro de usuarios incompletos */}
        <div className="mb-6 p-4 bg-gray-900 rounded-lg mx-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ExclamationCircleIcon className="h-5 w-5 text-primary-500" />
              <div>
                <Typography variant="h6" color="white" className="font-medium">
                  Filtro de Usuarios
                </Typography>
                <Typography variant="small" className="text-gray-400">
                  Mostrar solo usuarios con información incompleta
                </Typography>
              </div>
            </div>
            <Switch
              checked={showIncomplete}
              onChange={(e) => setShowIncomplete(e.target.checked)}
              className="h-full w-full checked:bg-primary-500"
              containerProps={{
                className: 'w-11 h-6',
              }}
              circleProps={{
                className: 'before:bg-gray-400 before:checked:bg-primary-500',
              }}
            />
          </div>

          {showIncomplete && (
            <div className="mt-3 p-3 bg-primary-900/20 border border-primary-500/20 rounded-lg">
              <Typography variant="small" className="text-primary-200">
                <span className="font-semibold">Nota:</span> Se están mostrando
                solo los usuarios que:
                <ul className="list-disc list-inside mt-1 ml-2">
                  <li>No han completado su información de cuenta</li>
                  <li>No han finalizado el proceso de onboarding</li>
                </ul>
              </Typography>
            </div>
          )}
        </div>

        <table className="w-full min-w-max table-auto text-center">
          <thead>
            <tr>
              {[
                'ID',
                'Nombre Publico',
                'Email',
                'Usuario',
                'Organización',
                'Rol',
                'Acciones',
              ].map((head) => (
                <th
                  key={head}
                  className="border-y border-blue-gray-100 bg-gray-700 p-4"
                >
                  <Typography
                    variant="small"
                    color="white"
                    className="font-normal leading-none opacity-70"
                  >
                    {head}
                  </Typography>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user: any) => (
              <tr
                key={user.id}
                className="hover:bg-gray-600/50 transition-colors"
              >
                <td className="p-4 border-b border-blue-gray-50">
                  <Typography
                    variant="small"
                    color="white"
                    className="font-normal"
                  >
                    {user.id}
                  </Typography>
                </td>
                <td className="p-4 border-b border-blue-gray-50">
                  <Typography
                    variant="small"
                    color="white"
                    className="font-normal"
                  >
                    {user.public_name}
                  </Typography>
                </td>
                <td className="p-4 border-b border-blue-gray-50">
                  <Typography
                    variant="small"
                    color="white"
                    className="font-normal"
                  >
                    {user.email}
                  </Typography>
                </td>
                <td className="p-4 border-b border-blue-gray-50">
                  <Typography
                    variant="small"
                    color="white"
                    className="font-normal"
                  >
                    {user.username}
                  </Typography>
                </td>
                <td className="p-4 border-b border-blue-gray-50">
                  <Typography
                    variant="small"
                    color="white"
                    className="font-normal"
                  >
                    {user.organization || '-'}
                  </Typography>
                </td>
                <td className="p-4 border-b border-blue-gray-50">
                  <Typography
                    variant="small"
                    color="white"
                    className="font-normal"
                  >
                    {
                    user.is_account_admin ? 'Administrador':
                    user.is_manager ? 'Manager'
                    : 'Usuario'
                    }
                  </Typography>
                </td>
                <td className="p-4 border-b border-blue-gray-50">
                  <div className="flex justify-center gap-2">
                    <Tooltip content="Ver detalles">
                      <IconButton
                        variant="text"
                        color="white"
                        onClick={() => {
                          setSelectedUser({
                            ...user,
                            contact_email: user.email,
                            organization_level: [user.organization.toString()],
                          } as GroupUser);
                          setViewModalOpen(true);
                        }}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content="Editar">
                      <IconButton variant="text" color="white">
                        <PencilIcon className="h-4 w-4" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content="Asignar Metas">
                      <IconButton variant="text" color="white">
                        <TagIcon className="h-4 w-4" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content="Gestionar Competencias">
                      <IconButton
                        variant="text"
                        color="white"
                        onClick={() => handleViewCapacities(user)}
                      >
                        <CpuChipIcon className="h-4 w-4" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>

      {selectedUser && (
        <ViewUserModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          user={selectedUser}
        />
      )}
      {/* Modal de Capacities */}
      <Dialog
        open={showCapacitiesModal}
        handler={() => setShowCapacitiesModal(false)}
        className="bg-gray-800 max-w-md"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <Typography variant="h5" className="text-white">
                Competencias del Usuario
              </Typography>

              <Typography variant="small" className="text-gray-400">
                Usuario :{' '}
                {
                  filteredUsers.find((user: any) => user.id === selectedUser?.id)
                    ?.email
                }
              </Typography>
            </div>
            <IconButton
              variant="text"
              color="white"
              onClick={() => setShowCapacitiesModal(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </IconButton>
          </div>

          <form onSubmit={formik.handleSubmit}>
            <div>
              <SelectLine
                label="Agregar / Eliminar competencias claves"
                name="capacities"
                isMulti
                value={formik.values.capacities}
                options={capacities}
                handleChange={formik.handleChange}
                handleBlur={formik.handleBlur}
                setFieldValue={formik.setFieldValue}
                errors={formik.errors}
                touched={formik.touched}
                isFetching={isLoadingCapacities}
              />
              <Typography variant="small" className="text-gray-400">
                Para eliminar, haz clic en la "X" de la competencia. Para
                agregar, tipea directamente el nombre o selecciona desde el
                listado.
              </Typography>
            </div>

            <div className="flex justify-end mt-6 gap-3">
              <Button
                onClick={() => setShowCapacitiesModal(false)}
                type="button"
                variant="outlined"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="filled"
                disabled={formik.isSubmitting}
              >
                <div className="flex items-center">
                  {formik.isSubmitting && <Spinner className="h-4 w-4 mr-2" />}
                  Guardar Cambios
                </div>
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </Card>
  );
};

export default UserTable;
export type { UserTableProps };
