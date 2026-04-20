import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  Typography,
  IconButton,
  Card,
  CardBody,
  Input,
  Checkbox,
  Button,
} from '@material-tailwind/react';
import { 
  XMarkIcon, 
  MagnifyingGlassIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { User } from '../../types/user';
import { getOrganizationUsers } from '../../services/userService';
import { toast } from 'react-toastify';

interface SelectUserModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (users: User[]) => void;
  multiple?: boolean;
}

export const SelectUserModal: React.FC<SelectUserModalProps> = ({
  open,
  onClose,
  onSelect,
  multiple = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const { data: users = [], isLoading, error } = useQuery(
    ['organization-users', searchTerm],
    () => getOrganizationUsers(),
    {
      enabled: open,
      staleTime: 30000,
      retry: 2,
    }
  );

  const filteredUsers = searchTerm
    ? users.filter(user =>
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users;

  const handleUserToggle = (user: User) => {
    if (!multiple) {
      setSelectedUsers([user]);
      onSelect([user]);
      onClose();
      return;
    }

    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleClearSelection = () => {
    setSelectedUsers([]);
  };

  const handleConfirm = () => {
    onSelect(selectedUsers);
    onClose();
  };

  const handleClose = () => {
    setSelectedUsers([]);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      handler={handleClose}
      className="bg-gray-900 text-white max-w-2xl"
    >
      <DialogHeader className="border-b border-gray-700 px-6 py-4">
        <Typography variant="h5" className="text-white">
          Seleccionar Usuario{multiple && selectedUsers.length > 0 ? `s (${selectedUsers.length})` : ''}
        </Typography>
        <IconButton
          variant="text"
          color="white"
          onClick={handleClose}
          className="!absolute top-3 right-3"
        >
          <XMarkIcon className="h-5 w-5" />
        </IconButton>
      </DialogHeader>

      <DialogBody className="px-6 py-4">
        <div className="space-y-4">
          <div className="relative">
            <Input
              type="text"
              label="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="!border-t-blue-gray-200 focus:!border-t-gray-900"
              labelProps={{
                className: "before:content-none after:content-none",
              }}
              icon={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
            />
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {isLoading ? (
              <div>Cargando usuarios...</div>
            ) : error ? (
              <div>Error al cargar usuarios</div>
            ) : filteredUsers.length === 0 ? (
              <div>No se encontraron usuarios</div>
            ) : (
              filteredUsers.map((user) => (
                <Card 
                  key={user.id}
                  className="bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700"
                >
                  <CardBody className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-gray-700">
                        <UserIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex flex-col">
                        <Typography variant="h6" className="text-white">
                          {user.first_name && user.last_name 
                            ? `${user.first_name} ${user.last_name}`
                            : user.username || 'Sin nombre'
                          }
                        </Typography>
                        <Typography variant="small" className="text-gray-400">
                          {user.email || 'Sin email'}
                        </Typography>
                      </div>
                    </div>
                    {multiple ? (
                      <Checkbox
                        checked={selectedUsers.some(u => u.id === user.id)}
                        onChange={() => handleUserToggle(user)}
                        className="h-5 w-5 rounded border-gray-500 checked:bg-primary-500"
                      />
                    ) : (
                      <Button
                        color="purple"
                        onClick={() => handleUserToggle(user)}
                        className="bg-primary-600 text-white hover:bg-primary-700"
                      >
                        Seleccionar
                      </Button>
                    )}
                  </CardBody>
                </Card>
              ))
            )}
          </div>

          {multiple && (
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
              <Button
                onClick={handleClose}
                variant="outlined"
                className="text-gray-400 border-gray-600 hover:border-gray-400"
              >
                Cancelar
              </Button>
              {selectedUsers.length > 0 && (
                <Button
                  onClick={handleClearSelection}
                  variant="filled"
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Limpiar selección
                </Button>
              )}
              <Button
                onClick={handleConfirm}
                variant="filled"
                className="bg-primary-600 text-white hover:bg-primary-700"
                disabled={selectedUsers.length === 0}
              >
                Seleccionar ({selectedUsers.length})
              </Button>
            </div>
          )}
        </div>
      </DialogBody>
    </Dialog>
  );
}; 