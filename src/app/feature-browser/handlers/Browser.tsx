import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { List } from '../components/CardList/CardList';
import withNavbar from '../../core/handlers/withNavbar';
import { useQuery } from '@tanstack/react-query';
import Favorites from '../components/Favorites/handlers/FavoritesRow';
import { debounce, flatMap, groupBy, map } from 'lodash';
import { useUser } from '../../core/feature-user/provider/userProvider';
import { Button } from '@material-tailwind/react';
import SearchBar from '../components/SearchBar';
import CardGrid from '../components/CardGrid';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Alert from 'src/app/ui/Alert';
import BotIcon from 'src/assets/icons/bot-icon.svg';
import api from 'src/app/core/api/apiProvider';

const StyledHeader = styled.h2`
  font-size: clamp(2rem, 13vw, 8rem);
  line-height: 1;
  font-weight: 400;
`;

const StyledTitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin: 5vh 10vw;
`;

const StyledListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3rem;
  margin: 5vh 0;
`;

function BrowserTitle() {
  const { userAccountInfo } = useUser();
  const navigate = useNavigate();
  return (
    <StyledTitleContainer>
      <div>
        <StyledHeader>
          Hola{' '}
          <span className="text-label-alt">{userAccountInfo?.public_name}</span>
        </StyledHeader>
        <StyledHeader>Wiki Insiders</StyledHeader>
      </div>

      <div className="flex gap-12">
        <p className="text-label-alt">
          <strong>Hola {userAccountInfo?.public_name}, estamos cerrando con éxito el MVP.</strong>
          Solo queda validar la funcionalidad "Contribuidor" con un grupo reducido de usuarios. 
          Gracias por todo tu apoyo. Muy pronto comenzamos la siguiente fase… ¡y esperamos contar contigo! Equipo Open KX.
        </p>
      </div>
      <div className="flex gap-12">
        <Button
          onClick={() => {
            navigate('/diagnosticador');
          }}
        >
          START
        </Button>
      </div>
    </StyledTitleContainer>
  );
}

const filterCategories = {
  C: {
    label: "Comunicación",
    keywords: ["comunica", "adapta", "mensaje", "colabora", "redacción", "influencia", "comprensión", "claridad", "cambio", "stakeholders", "feedback", "expectativas", "cultura"]
  },
  L: {
    label: "Liderazgo",
    keywords: ["cambio", "estrategia", "innovación", "adaptabilidad", "adaptación", "influencia", "inspiración", "visión", "rendimiento", "liderazgo", "estrategia", "estratégica", "coaching", "resultados", "tiempo", "alineación", "negocio"]
  },
  P: {
    label: "Proyectos",
    keywords: ["proyecto", "programas", "tiempo", "recursos", "negocio", "necesidades", "stakeholders", "cambio", "PM", "project"]
  },
  N: {
    label: "Negociación",
    keywords: ["estrategia", "acuerdo", "negocia", "escenario", "alternativ", "influencia", "persua", "adapta", "clima", "contexto", "impacto", "problema"]
  },
  I: {
    label: "IT & PoCs",
    keywords: ["innovación", "innovation", "estrategia", "cambio", "futuro", "crecimiento", "inspiración", "metodo", "agil", "lean", "disrup", "digital", "poc", "valida", "mvp", "idea", "data", "dato", "analytics", "ETL", "machine learning", "ML", "dama", "personalización", "cloud", "google", "nube", "sql", "big", "DL"]
  },
  O: {
    label: "Coaching",
    keywords: ["inspira", "motiva", "mentor", "tiempo", "personas", "conflicto", "coach", "empatía", "cultura", "adapta", "expecta", "crisis", "bienestar", "confia"]
  }
};

const Browser = () => {
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  let [searchParams, setSearchParams] = useSearchParams();

  const debounceSearchTerm = useCallback(
    debounce((param: string) => {
      setSearchTerm(param);
    }, 500),
    []
  );
  const { userInfo, userAccountInfo } = useUser();
  const { data, isFetching } = useQuery({
    queryKey: ['cardList'],
    queryFn: async () => {
      const { data } = await api.get(
        `${import.meta.env.VITE_API_URL}/recommendations/contents`
      );

      return data;
    },
  });

  const searchQuery = useQuery({
    queryKey: ['searchTerm', searchTerm],
    queryFn: async () => {
      if (searchTerm !== '') {
        const { data } = await api.get(
          `${
            import.meta.env.VITE_API_URL
          }/contents/contents_search/?query_param=${searchTerm}`
        );
        return data;
      }
      return null;
    },
    enabled: !!searchTerm,
  });

  const mandatoryQuery = useQuery({
    queryKey: ['mandatoryList'],
    queryFn: async () => {
      const { data } = await api.get(
        `${import.meta.env.VITE_API_URL}/contents/mandatory`
      );
      return data;
    },
  });

  const internalQuery = useQuery({
    queryKey: ['internalList'],
    queryFn: async () => {
      const { data } = await api.get(
        `${import.meta.env.VITE_API_URL}/contents/internal`
      );
      return data;
    },
  });

  const newContentsQuery = useQuery({
    queryKey: ['newList'],
    queryFn: async () => {
      const { data } = await api.get(
        `${import.meta.env.VITE_API_URL}/contents/new`
      );
      return data;
    },
  });

  useEffect(() => {
    if (searchParams.get('search')) {
      debounceSearchTerm(searchParams.get('search') || '');
      setSearchInput(searchParams.get('search') || '');
    }
    if (searchParams.get('filter')) {
      setFilterTerm(searchParams.get('filter') || '');
    }
  });

  const handleSearch = (param: string) => {
    setSearchParams({ search: param });
    setSearchInput(param);
    debounceSearchTerm(param);
  };

  const handleFilter = (param: string) => {
    setSearchParams({ filter: param });
    setFilterTerm(param);
  };

  const filterContent = (content: any) => {
    console.log(content.id, content.capacity)
    if (!filterTerm) return true;
    
    const selectedCategory = filterCategories[filterTerm as keyof typeof filterCategories];
    if (!selectedCategory) return true;

    // Handle capacity as a string
    if (typeof content.capacity !== 'string') return false;

    // Return true if any keyword matches, no matter how many matches there are
    const capacityLower = content.capacity.toLowerCase();
    return selectedCategory.keywords.some(keyword => 
      capacityLower.includes(keyword.toLowerCase())
    );
  };

  const values = flatMap(data, (item) => {
    if (Array.isArray(item.capacity_filter)) {
      let cap = item.capacity_filter.map((capacity: any) => ({
        ...item,
        capacity: capacity.capacity,
      }));
      return cap
    } else {
      return { ...item };
    }
  });

  const browserContent = (
    <section className="container mx-auto px-3 lg:px-0">
      <StyledListContainer>
        <Alert image={BotIcon}>
          <p>
            <strong>Hola {userAccountInfo?.public_name}, estamos cerrando con éxito el MVP. </strong>
            Solo queda validar la funcionalidad "Contribuidor" con un grupo reducido de usuarios. 
            Gracias por todo tu apoyo. Muy pronto comenzamos la siguiente fase… ¡y esperamos contar contigo! Equipo Open KX.
          </p>
          <a
            className="self-center"
            href="https://forms.gle/T2ELLU6vzwfC9RY9A"
            target="_blank"
          >
            <Button color="white" variant="outlined" type="button">
              Feedback
            </Button>
          </a>
        </Alert>
        <SearchBar
          handleSearch={handleSearch}
          handleFilter={handleFilter}
          activeFilter={filterTerm}
          searchTerm={searchInput}
        />
        {searchTerm === '' && filterTerm === '' && (
          <>
            {mandatoryQuery.data && mandatoryQuery.data.length > 0 && (
              <List
                data={mandatoryQuery.data}
                isFetching={mandatoryQuery.isFetching}
                title="Contenido Mandatorio"
                handleFilter={handleFilter}
                showSeeAll={false}
              />
            )}
            {internalQuery.data && internalQuery.data.length > 0 && (
            <List
              data={internalQuery.data}
              isFetching={internalQuery.isFetching}
              title="Interno de tu empresa"
              handleFilter={handleFilter}
              showSeeAll={false}
            />
            )}
            <List
              data={data}
              isFetching={isFetching}
              title="Alineado con tu ADN Digital"
              handleFilter={handleFilter}
              showSeeAll={false}
            />
            <List
              data={newContentsQuery.data}
              isFetching={newContentsQuery.isFetching}
              title="Lo mas reciente"
              handleFilter={handleFilter}
              showSeeAll={false}
            />
            <Favorites contents={data} isFetching={isFetching} />
            <CardGrid
              id="card-grid"
              data={data}           
              isFetching={isFetching}
              title="Podrían interesarte"
              handleFilter={handleFilter}
            />
          </>
        )}
        {searchTerm === '' && filterTerm === '' && (
          <CardGrid
            id="card-grid"
            data={data}
            isFetching={isFetching}
            title="Recomendaciones"
            handleFilter={handleFilter}
          />
        )}
        {searchTerm !== '' && (
          <CardGrid
            id="card-grid"
            data={searchQuery.data}
            isFetching={searchQuery.isFetching}
            searchParam={searchTerm}
          />
        )}
        {filterTerm !== '' && (
          <CardGrid
            id="card-grid"
            data={Array.from(
              new Set(
                values?.filter(filterContent)
                  .map(content => content.id)
              )
            ).map(id => 
              values.find(content => content.id === id)
            )}
            isFetching={isFetching}
            filterParam={filterTerm}
            title={filterCategories[filterTerm as keyof typeof filterCategories]?.label || "Filtered Content"}
          />
        )}
      </StyledListContainer>
    </section>
  );

  return withNavbar({ children: browserContent });
};

export default Browser;
