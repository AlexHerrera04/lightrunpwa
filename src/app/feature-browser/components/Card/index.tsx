import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import classNames from 'classnames';
import { capitalize } from 'lodash';

export interface CardData {
  id: string;
  title: string;
  type: string;
  public_image: string;
  short_description: string;
  external_source?: string;
  description: string;
  name: string;
  rating: string;
  origin: string;
}

interface Props extends CardData {
  isSelected: boolean;
}

export const Card = (props: Props) => {
  const [isHovering, setIsHovering] = React.useState(false);

  const handleMouseOver = () => setIsHovering(true);
  const handleMouseOut = () => setIsHovering(false);

  return (
    <div>
      <motion.div
        style={{
          backgroundImage: `url(${props.public_image})`,
        }}
        className={classNames({
          'bg-center bg-cover bg-gray-600 flex flex-col h-48 items-center rounded-lg shadow-blue-gray-500/10 shadow-md relative':
            true,
          'justify-between': !isHovering,
          'justify-end': isHovering,
        })}
      >
        <span className="absolute top-2 left-2 bg-black/50 rounded-lg p-2 text-xs shadow-md drop-shadow-md">
          {capitalize(props.type ? props.type.split('_').join(' ') : 'Generic')}
        </span>
        {props.origin && (
          <span className="absolute top-2 right-2 bg-black/50 rounded-lg p-2 text-xs shadow-md drop-shadow-md">
            {props.external_source
              ? capitalize(props.external_source)
                : capitalize(props.origin)
            }
          </span>
        )}
      </motion.div>
      <motion.h2 className="text-lg font-bold mt-3 mb-0">
        {props.name}
      </motion.h2>
      <motion.p className="text-sm text-white/60 my-2">
        {props.short_description}
      </motion.p>
      <motion.div className="text-xs font-bold text-white/60">
        {props.rating}
      </motion.div>
    </div>
  );
};

/*
<motion.div
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      className="w-96 flex flex-col justify-center items-center max-w-sm mx-auto rounded-lg transition-all"
    >
      <motion.div
        style={{
          backgroundImage: `url(${props.public_image})`,
        }}
        className={classNames({
          'bg-center bg-cover bg-gray-600 flex flex-col h-64 items-center rounded-lg shadow-blue-gray-500/10 shadow-md w-full':
            true,
          'justify-between': !isHovering,
          'justify-end': isHovering,
        })}
      >
        {!isHovering && (
          <AnimatePresence>
            <motion.div
              layout="position"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, bounce: 0 }}
              className="bg-dark-600/70 px-4 py-1 rounded-lg self-start w-max mt-4 ml-2 shadow-md"
            >
              <motion.span className="text-light-100 text-sm">
                {props.type}
              </motion.span>
            </motion.div>
          </AnimatePresence>
        )}

        <motion.div
          layout="position"
          transition={{
            layout: { duration: 0.4, type: 'spring', bounce: 0 },
          }}
          style={{ borderRadius: '0.25rem' }}
          className="bg-dark-600/95 p-4 w-full max-h-96"
        >
          <motion.h2 className="text-light-100 text-md">{props.name}</motion.h2>
          {isHovering && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ layout: { duration: 0.2, bounce: 0 } }}
            >
              <motion.p className="dark:text-light-500 text-sm py-2">
                {props.short_description}
              </motion.p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
*/
