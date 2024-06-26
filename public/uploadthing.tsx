// public/uploadthing.tsx

import React from 'react';

interface UploadButtonProps {
    endpoint: string;
    onClientUploadComplete: (res: any) => void;
    onUploadError: (error: Error) => void;
}

export const UploadButton: React.FC<UploadButtonProps> = ({ endpoint, onClientUploadComplete, onUploadError }) => {
    return (
        <button onClick={() => {
            // Simulate an upload process
            const result = { success: true }; // Replace with actual upload logic
            if (result.success) {
                onClientUploadComplete(result);
            } else {
                onUploadError(new Error('Upload failed'));
            }
        }}>
            Upload Button
        </button>
    );
};

interface UploadDropzoneProps {
    endpoint: string;
    onClientUploadComplete: (res: any) => void;
    onUploadError: (error: Error) => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ endpoint, onClientUploadComplete, onUploadError }) => {
    return (
        <div onDrop={() => {
            // Simulate an upload process
            const result = { success: true }; // Replace with actual upload logic
            if (result.success) {
                onClientUploadComplete(result);
            } else {
                onUploadError(new Error('Upload failed'));
            }
        }}>
            Upload Dropzone
        </div>
    );
};
