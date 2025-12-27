/**
 * Fitness Data Uploader Component
 *
 * Allows users to upload their fitness data to Memory Protocol
 * for monetization through data queries.
 */

'use client';

import React, { useState } from 'react';
import { Spinner, Button } from '@/components/ui';
import { MemoryInput, MemoryTextarea, MemorySelect } from '@/components/ui';
import { usePlatform } from '@/contexts/PlatformContext';
import { useFormState } from '@/contexts/FormStateContext';
import { getMemoryClient, type FitnessDataUpload } from '@/services/memoryApi';
import { createRemoteLogger } from '@/utils/remoteLogger';
import toast from 'react-hot-toast';

const logger = createRemoteLogger('FitnessDataUploader');

interface FitnessDataUploaderProps {
  onDataUploaded?: (uploadId: string) => void;
  className?: string;
}

interface UploadFormData {
  dataType: 'structured' | 'unstructured';
  schema: string;
  description: string;
  tags: string[];
  tagInput: string;
  quality: number;
  data: string; // JSON string for now
}

export default function FitnessDataUploader({
  onDataUploaded,
  className = '',
}: FitnessDataUploaderProps) {
  const { wallet } = usePlatform();
  const { isLoading, isSubmitting, resetForm, handleSubmit } = useFormState();
  const [formData, setFormData] = useState<UploadFormData>({
    dataType: 'structured',
    schema: 'fitness-workouts',
    description: '',
    tags: [],
    tagInput: '',
    quality: 3,
    data: '',
  });

  // Sample fitness data templates
  const sampleData = {
    'fitness-workouts': {
      workouts: [
        {
          date: '2025-01-15',
          exercise: 'pushups',
          sets: [
            { reps: 15, weight: 0 },
            { reps: 12, weight: 0 },
            { reps: 10, weight: 0 },
          ],
          totalReps: 37,
        },
        {
          date: '2025-01-14',
          exercise: 'squats',
          sets: [
            { reps: 20, weight: 0 },
            { reps: 18, weight: 0 },
          ],
          totalReps: 38,
        },
      ],
    },
    'fitness-goals': {
      goals: [
        {
          type: 'pushups',
          target: 100,
          current: 75,
          deadline: '2025-02-01',
        },
        {
          type: 'squats',
          target: 200,
          current: 150,
          deadline: '2025-02-01',
        },
      ],
    },
  };

  const addTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, prev.tagInput.trim()],
        tagInput: '',
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const loadSampleData = () => {
    const sample = sampleData[formData.schema as keyof typeof sampleData];
    if (sample) {
      setFormData((prev) => ({
        ...prev,
        data: JSON.stringify(sample, null, 2),
        description: `Sample ${formData.schema} data for monetization`,
        tags: ['fitness', 'workout', 'sample', formData.schema],
      }));
    }
  };

  const validateData = (): { isValid: boolean; errors: { field: string; message: string }[] } => {
    const validationErrors: { field: string; message: string }[] = [];

    if (!wallet.address) {
      validationErrors.push({ field: 'wallet', message: 'Please connect your wallet first' });
    }

    if (!formData.description.trim()) {
      validationErrors.push({ field: 'description', message: 'Please provide a description' });
    }

    if (!formData.data.trim()) {
      validationErrors.push({ field: 'data', message: 'Please provide data to upload' });
    }

    try {
      JSON.parse(formData.data);
    } catch (error) {
      validationErrors.push({ field: 'data', message: 'Data must be valid JSON' });
    }

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
    };
  };

  const handleUpload = async () => {
    const validationResult = validateData();
    if (!validationResult.isValid) {
      // FormStateWrapper will handle the errors
      return;
    }

    try {
      const client = getMemoryClient();

      // Check if client is available
      if (!client) {
        throw new Error('Memory API not configured. Please set NEXT_PUBLIC_MEMORY_API_KEY');
      }

      const uploadData: FitnessDataUpload = {
        userId: wallet.address!,
        dataType: formData.dataType,
        schema: formData.dataType === 'structured' ? formData.schema : undefined,
        data: JSON.parse(formData.data),
        metadata: {
          description: formData.description,
          tags: formData.tags,
          quality: formData.quality,
        },
      };

      const result = await client.uploadFitnessData(uploadData);

      if (result.success) {
        logger.info('Fitness data uploaded successfully', { uploadId: result.uploadId });
        toast.success(
          'Data uploaded successfully! You can now earn $MEM when apps query your data.'
        );

        onDataUploaded?.(result.uploadId);

        // Reset form
        setFormData({
          dataType: 'structured',
          schema: 'fitness-workouts',
          description: '',
          tags: [],
          tagInput: '',
          quality: 3,
          data: '',
        });
        resetForm();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      logger.error('Failed to upload fitness data', error);
      toast.error('Failed to upload data. Please try again.');
      throw error;
    }
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-6 border border-gray-700 ${className}`}>
      <h2 className="text-xl font-bold text-[#fcb131] mb-2">Monetize Your Fitness Data</h2>
      <p className="text-gray-400 text-sm mb-6">
        Upload your workout data to earn $MEM tokens when other fitness apps query your information.
      </p>

      {/* Data Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Data Type</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="structured"
              checked={formData.dataType === 'structured'}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, dataType: e.target.value as 'structured' }))
              }
              className="mr-2"
            />
            <span className="text-sm text-gray-300">Structured (Fixed Schema)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="unstructured"
              checked={formData.dataType === 'unstructured'}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, dataType: e.target.value as 'unstructured' }))
              }
              className="mr-2"
            />
            <span className="text-sm text-gray-300">Unstructured (Flexible)</span>
          </label>
        </div>
      </div>

      {/* Schema Selection (for structured data) */}
      {formData.dataType === 'structured' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Schema Type</label>
          <MemorySelect
            value={formData.schema}
            onChange={(e) => setFormData((prev) => ({ ...prev, schema: e.target.value }))}
          >
            <option value="fitness-workouts">Fitness Workouts</option>
            <option value="fitness-goals">Fitness Goals</option>
            <option value="fitness-progress">Fitness Progress</option>
            <option value="fitness-achievements">Fitness Achievements</option>
          </MemorySelect>
        </div>
      )}

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
        <MemoryTextarea
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Describe your data to help other apps understand its value..."
          rows={3}
        />
      </div>

      {/* Tags */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 bg-[#fcb131] text-black text-xs rounded-full"
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-600">
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex">
          <MemoryInput
            type="text"
            value={formData.tagInput}
            onChange={(e) => setFormData((prev) => ({ ...prev, tagInput: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
            placeholder="Add tags..."
            className="flex-1 rounded-r-none"
          />
          <Button
            onClick={addTag}
            variant="primary"
            size="sm"
            className="rounded-l-none border-l-0"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Quality Rating */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Data Quality Rating: {formData.quality}/5
        </label>
        <input
          type="range"
          min="1"
          max="5"
          value={formData.quality}
          onChange={(e) => setFormData((prev) => ({ ...prev, quality: parseInt(e.target.value) }))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Poor</span>
          <span>Excellent</span>
        </div>
      </div>

      {/* Data Input */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-300">Data (JSON)</label>
          <button onClick={loadSampleData} className="text-xs text-[#fcb131] hover:underline">
            Load Sample Data
          </button>
        </div>
        <MemoryTextarea
          value={formData.data}
          onChange={(e) => setFormData((prev) => ({ ...prev, data: e.target.value }))}
          placeholder="Paste your fitness data as JSON..."
          rows={10}
          className="font-mono text-sm"
        />
      </div>

      {/* Upload Button */}
      <Button
        onClick={() => handleSubmit(handleUpload)}
        disabled={isSubmitting || !wallet.address}
        variant="success"
        size="lg"
        loading={isSubmitting}
        fullWidth
      >
        {isSubmitting ? 'Uploading...' : 'Upload & Monetize Data'}
      </Button>

      {!wallet.address && (
        <p className="text-center text-red-400 text-sm mt-2">
          Please connect your wallet to upload data
        </p>
      )}

      {/* Info Section */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="font-semibold text-[#fcb131] mb-2">How It Works</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Upload your fitness data to Memory Protocol</li>
          <li>• Other apps can query your data by paying $MEM tokens</li>
          <li>• You earn a share of those fees automatically</li>
          <li>• Higher quality data = more queries = more earnings</li>
        </ul>
      </div>

      {/* Memory Protocol Attribution */}
      <div className="mt-4 text-center text-xs text-gray-500">
        Data monetization powered by{' '}
        <a
          href="https://memoryproto.co"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#fcb131] hover:underline"
        >
          Memory Protocol
        </a>
      </div>
    </div>
  );
}
