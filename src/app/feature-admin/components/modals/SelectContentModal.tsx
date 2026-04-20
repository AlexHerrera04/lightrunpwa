import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  Typography,
  IconButton,
  Card,
  CardBody,
  Input,
  Button,
} from '@material-tailwind/react';
import {
  XMarkIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  BuildingLibraryIcon,
  GlobeAltIcon,
  UserGroupIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { Content, ContentOrigin } from '../../types/goals';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getContents, getAssessments } from '../../services/contentService';
import ContentDetailModal from '../ContentDetailModal';
import { debounce } from 'lodash';

interface SelectContentModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (content: Content) => void;
  contentType?: 'quiz' | 'content' | 'assessment';
}

export const SelectContentModal: React.FC<SelectContentModalProps> = ({
  open,
  onClose,
  onSelect,
  contentType = 'content',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrigin, setSelectedOrigin] =
    useState<ContentOrigin>('internal');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [showContentDetail, setShowContentDetail] = useState(false);

  const {
    data: contentData,
    refetch: refetchContent,
    isLoading: isLoadingContent
  } = useQuery(
    ['contents', selectedOrigin, searchTerm],
    () => getContents({
      page: 1,
      limit: 100,
      origin: selectedOrigin,
      search: searchTerm,
      type: 'content'
    }),
    {
      enabled: open && contentType !== 'assessment'
    }
  );

  const {
    data: assessmentData,
    refetch: refetchAssessment,
    isLoading: isLoadingAssessments
  } = useQuery(
    ['assessments', searchTerm],
    () => getAssessments({ search: searchTerm }),
    {
      enabled: open && contentType === 'assessment',
      onSuccess: (data) => {
        console.log('Assessment data loaded:', data);
      },
      onError: (error) => {
        console.error('Error loading assessments:', error);
      }
    }
  );

  const contents = useMemo(() => {
    const data = contentType === 'assessment' ? assessmentData : contentData;
    return data?.contents || [];
  }, [contentType, assessmentData, contentData]);

  useEffect(() => {
    if (open) {
      if (contentType === 'assessment') {
        refetchAssessment();
      } else {
        refetchContent();
      }
    }
  }, [open, contentType, searchTerm]);

  const isLoading = contentType === 'assessment' ? isLoadingAssessments : isLoadingContent;

  const originTypes = [
    {
      type: 'internal' as ContentOrigin,
      label: 'Contenido Interno',
      icon: BuildingLibraryIcon,
      description: 'Contenido creado por tu organización',
      color: 'bg-primary-500',
      hoverColor: 'hover:bg-primary-600',
    },
    {
      type: 'external' as ContentOrigin,
      label: 'Contenido Externo',
      icon: GlobeAltIcon,
      description: 'Contenido compartido por expertos o proovedoores externos',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
    },
    {
      type: 'community' as ContentOrigin,
      label: 'Comunidad',
      icon: UserGroupIcon,
      description: 'Contenido generado por la comunidad y/o IA',
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
    },
    {
      type: 'public' as ContentOrigin,
      label: 'Público',
      icon: AcademicCapIcon,
      description: 'Contenido de fuentes publicas',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
    },
  ];

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollHeight, scrollTop, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      if (contentType === 'assessment' && assessmentData && !isLoading) {
        refetchAssessment();
      } else if (contentData && !isLoading) {
        refetchContent();
      }
    }
  }, [contentType, assessmentData, contentData, isLoading]);

  const renderCard = (content: Content) => {
    if (!content) return null;

    return (
      <Card
        key={content.id}
        className="bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer border border-gray-700"
        onClick={() => {
          setSelectedContent(content);
          setShowContentDetail(true);
        }}
      >
        <CardBody className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
              {content.public_image ? (
                <img
                  src={content.public_image}
                  alt={content.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <DocumentTextIcon className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Typography variant="h6" className="text-white mb-1 truncate">
                {content.name}
              </Typography>
              <Typography className="text-sm text-gray-400 mb-3 line-clamp-2">
                {content.description}
              </Typography>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(content);
                    onClose();
                  }}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600"
                >
                  Seleccionar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedContent(content);
                    setShowContentDetail(true);
                  }}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-600"
                >
                  Ver detalles
                </button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  };

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  return (
    <Dialog 
      open={open} 
      handler={onClose} 
      size="xxl"
      className="bg-gray-900 text-white max-w-5xl mx-auto"
      animate={{
        mount: { scale: 1, y: 0 },
        unmount: { scale: 0.9, y: -100 },
      }}
    >
      <DialogHeader className="flex justify-between items-center border-b border-gray-800 px-6 py-4">
        <Typography variant="h5" className="text-gray-100">
          {contentType === 'assessment' ? 'Seleccionar Assessment' : 'Seleccionar Contenido'}
        </Typography>
        <IconButton variant="text" onClick={onClose} className="text-gray-400 hover:text-white">
          <XMarkIcon className="h-6 w-6" />
        </IconButton>
      </DialogHeader>

      <DialogBody className="h-[600px] overflow-hidden p-6">
        <div className="mb-6">
          <Input
            type="text"
            label="Buscar contenido..."
            onChange={(e) => debouncedSearch(e.target.value)}
            icon={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
            className="!border !border-gray-700 bg-gray-800 text-gray-100"
            labelProps={{
              className: "text-gray-400"
            }}
            containerProps={{
              className: "min-w-[100px]"
            }}
          />
        </div>

        <div className="flex h-[calc(100%-80px)] gap-6">
          {contentType !== 'assessment' && (
            <div className="w-80 flex-shrink-0 bg-gray-800/50 rounded-xl p-4">
              <Typography variant="h6" className="text-gray-300 mb-4 px-2">
                Origen del Contenido
              </Typography>
              <div className="flex flex-col gap-3">
                {originTypes.map((origin) => (
                  <button
                    key={origin.type}
                    onClick={() => setSelectedOrigin(origin.type)}
                    className={`
                      p-4 rounded-lg transition-all text-left
                      ${
                        selectedOrigin === origin.type
                          ? `${origin.color} text-white shadow-lg`
                          : `bg-gray-800 hover:bg-gray-700`
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`
                          p-2 rounded-lg
                          ${
                            selectedOrigin === origin.type
                              ? 'bg-white/10'
                              : 'bg-gray-700'
                          }
                        `}
                      >
                        <origin.icon
                          className={`h-6 w-6 ${
                            selectedOrigin === origin.type
                              ? 'text-white'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                      <div>
                        <Typography className="text-sm font-medium">
                          {origin.label}
                        </Typography>
                        <Typography
                          className={`text-xs mt-1 ${
                            selectedOrigin === origin.type
                              ? 'text-white/80'
                              : 'text-gray-400'
                          }`}
                        >
                          {origin.description}
                        </Typography>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`
            ${contentType === 'assessment' ? 'w-full' : 'flex-1'}
            overflow-hidden flex flex-col
          `}>
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Typography className="text-gray-400">Cargando...</Typography>
              </div>
            ) : contents && contents.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 h-full overflow-y-auto pr-2">
                {contents.map((content: Content) => {
                  return (
                    <React.Fragment key={content.id}>
                      {renderCard(content)}
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <DocumentTextIcon className="h-16 w-16 text-gray-600 mb-4" />
                <Typography variant="h6" className="text-gray-400">
                  No hay contenidos disponibles
                </Typography>
                <Typography className="text-sm text-gray-500 mt-2">
                  {contentType === 'assessment' 
                    ? 'No hay assessments disponibles en esta sección'
                    : 'No hay contenidos disponibles en esta sección'}
                </Typography>
              </div>
            )}
          </div>
        </div>
      </DialogBody>

      {selectedContent && (
        <ContentDetailModal
          content={selectedContent}
          open={showContentDetail}
          onClose={() => {
            setShowContentDetail(false);
            setSelectedContent(null);
          }}
          onConfirm={(content) => {
            onSelect(content);
            setShowContentDetail(false);
            setSelectedContent(null);
            onClose();
          }}
        />
      )}
    </Dialog>
  );
};
