import React from 'react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
  Typography,
} from '@material-tailwind/react';
import { Content } from '../types/goals';

interface ContentDetailModalProps {
  content: Content | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (content: Content) => void;
}

export const ContentDetailModal: React.FC<ContentDetailModalProps> = ({
  content,
  open,
  onClose,
  onConfirm,
}) => {
  if (!content) return null;

  return (
    <Dialog
      open={open}
      handler={onClose}
      className="bg-[#1a1f2e] text-white max-w-3xl mx-auto rounded-lg overflow-hidden"
    >
      <DialogHeader className="text-2xl font-bold px-8 py-6 bg-[#1a1f2e] border-b border-gray-800">
        <h2 className="text-gray-300">Detalles del Contenido</h2>
      </DialogHeader>

      <DialogBody className="p-8 bg-[#1a1f2e]">
        {/* Nombre y Descripción */}
        <div className="mb-8">
          <label className="text-sm text-gray-500">Nombre</label>
          <h3 className="text-2xl text-white mt-2">{content.name}</h3>
          <p className="text-gray-400 mt-4 leading-relaxed text-base">
            {content.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-8">
          {/* Tipo */}
          <div>
            <label className="text-sm text-gray-500">Tipo</label>
            <p className="text-lg text-white mt-2">
              {content.type?.toLowerCase().includes('quiz')
                ? 'Assessment'
                : content.type}
            </p>
          </div>

          {/* Origen */}
          <div>
            <label className="text-sm text-gray-500">Origen</label>
            <p className="text-lg text-white mt-2">
              {content.origin === 'internal' ? 'Interno' : content.origin}
            </p>
          </div>

          {/* Fecha de Creación */}
          <div>
            <label className="text-sm text-gray-500">Fecha de Creación</label>
            <p className="text-lg text-white mt-2">
              {new Date(content.created_at).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Recurso */}
          <div>
            <label className="text-sm text-gray-500">Recurso</label>
            <div className="flex items-center mt-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  content.resource_url ? 'bg-emerald-500' : 'bg-red-500'
                } mr-2`}
              />
              <p className="text-lg text-white">
                {content.resource_url ? 'Disponible' : 'No disponible'}
              </p>
            </div>
          </div>
        </div>
      </DialogBody>

      <DialogFooter className="px-8 py-4 bg-[#1a1f2e] border-t border-gray-800">
        <div className="flex justify-end gap-4 w-full">
          <Button
            variant="text"
            onClick={onClose}
            className="px-6 py-2 text-gray-300 hover:bg-gray-800 transition-colors rounded-lg"
          >
            CANCELAR
          </Button>
          <Button
            variant="filled"
            onClick={() => onConfirm(content)}
            className="px-6 py-2 bg-purple-600 text-white hover:bg-purple-700 transition-colors rounded-lg"
          >
            SELECCIONAR
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
};

export default ContentDetailModal;
