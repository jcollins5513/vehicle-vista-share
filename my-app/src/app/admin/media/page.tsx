'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import useSWR from 'swr';
import { Media } from '@/types/media';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MediaManager = () => {
  const { data, error, mutate } = useSWR<Media[]>('/api/media/general', fetcher);
  const [mediaItems, setMediaItems] = useState<Media[]>([]);

  useEffect(() => {
    if (data) {
      setMediaItems(data.sort((a, b) => a.order - b.order));
    }
  }, [data]);

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(mediaItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedOrder = items.map((item, index) => ({ ...item, order: index }));
    setMediaItems(updatedOrder);

    await fetch('/api/media/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedOrder.map(({ id, order }) => ({ id, order }))),
    });

    mutate(); // Revalidate data
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/media/${id}`, {
      method: 'DELETE',
    });
    mutate(); // Revalidate data
  };

  if (error) return <div>Failed to load media</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Manage General Media Playlist</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="media-list">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {mediaItems.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="flex items-center justify-between p-4 mb-2 bg-gray-100 rounded-lg shadow"
                    >
                      <div className="flex items-center">
                        <img src={item.url} alt="media thumbnail" className="w-16 h-16 object-cover rounded mr-4" />
                        <span>{item.s3Key}</span>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default MediaManager;
