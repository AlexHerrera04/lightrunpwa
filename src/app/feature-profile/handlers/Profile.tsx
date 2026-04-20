import { FunctionComponent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from 'src/app/core/feature-user/provider/userProvider';
import withNavbar from 'src/app/core/handlers/withNavbar';
import Button from 'src/app/ui/Button';

const Profile: FunctionComponent<any> = () => {
  const { userInfo, userAccountInfo } = useUser();
  const navigate = useNavigate();
  const pageContent = (
    <>
      <div className="my-5 container mx-auto">
        <h1 className="text-3xl font-bold text-white">Perfil</h1>
        <div className="bg-gray-800 rounded-lg p-6 my-3 shadow-md">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 pr-4">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-300">Usuario:</h2>
                <p className="text-white">{userInfo?.username || '-'}</p>
              </div>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-300">
                  Nombre público:
                </h2>
                <p className="text-white">
                  {userAccountInfo?.public_name || '-'}
                </p>
              </div>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-300">E-mail:</h2>
                <p className="text-white">{userInfo?.email || '-'}</p>
              </div>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-300">Nombre:</h2>
                <p className="text-white">{userInfo?.first_name || '-'}</p>
                {/* Added default value */}
              </div>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-300">Apellido:</h2>
                <p className="text-white">{userInfo?.last_name || '-'}</p>
                {/* Added default value */}
              </div>
            </div>

            {/* Added a separate section for the link */}
            <div className="md:w-1/2 mt-4 md:mt-0">
              {/* Added responsiveness and margin top */}
              <Button
                variant="primary"
                onClick={() => navigate('./change-password')}
              >
                Cambiar contraseña
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return withNavbar({ children: pageContent });
};

export default Profile;
