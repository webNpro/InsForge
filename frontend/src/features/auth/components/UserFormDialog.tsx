import React, { useState, useEffect } from 'react';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { authService } from '@/features/auth/services/auth.service';
import { Button, Input, Label, Alert, AlertDescription } from '@/components';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/radix/Dialog';
import ErrorIcon from '@/assets/icons/error.svg';
import { useToast } from '@/lib/hooks/useToast';
import { useUsers } from '@/features/auth/hooks/useUsers';

interface User {
  id?: string;
  email: string;
  password?: string;
  name?: string;
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}

// Validation helpers
const validateEmail = (email: string): string => {
  if (!email.trim()) {
    return 'Cannot leave empty';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Incorrect format';
  }
  return '';
};

const validatePassword = (password: string): string => {
  if (!password.trim()) {
    return 'Cannot leave empty';
  }
  return '';
};

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validation states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showValidation, setShowValidation] = useState(false);

  const { showToast } = useToast();
  const { refetch } = useUsers();

  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setPassword('');
    } else {
      setEmail('');
      setPassword('');
    }
    setError('');
    setEmailError('');
    setPasswordError('');
    setShowValidation(false);
  }, [user, open]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (emailError && showValidation) {
      const error = validateEmail(e.target.value);
      setEmailError(error);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear error when user starts typing
    if (passwordError && showValidation) {
      const error = validatePassword(e.target.value);
      setPasswordError(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    const emailValidationError = validateEmail(email);
    const passwordValidationError = validatePassword(password);

    setEmailError(emailValidationError);
    setPasswordError(passwordValidationError);
    setShowValidation(true);

    if (emailValidationError || passwordValidationError) {
      return;
    }

    setLoading(true);

    try {
      const userData: User = { email };
      if (password) {
        userData.password = password;
      }
      if (isEditing && user?.id) {
        userData.id = user.id;
      }

      await authService.register(
        userData.email,
        userData.password || '',
        userData.name,
        userData.id
      );
      void refetch();
      onOpenChange(false);
      showToast('User created successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create user', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-6"
        >
          {/* Email Field */}
          <div className="flex flex-col gap-3">
            <Label htmlFor="user-email" className="text-sm font-medium text-zinc-950">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="user-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={handleEmailChange}
                className={`pl-10 ${emailError && showValidation ? 'border-red-500 focus:border-red-500' : ''}`}
                autoFocus={false}
              />
            </div>
            {emailError && showValidation && (
              <div className="flex items-center gap-1 -mt-1.5">
                <img src={ErrorIcon} alt="Error" className="h-4 w-4" />
                <p className="text-xs text-red-600">{emailError}</p>
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-3">
            <Label htmlFor="user-password" className="text-sm font-medium text-zinc-950">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="user-password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={handlePasswordChange}
                className={`pl-10 ${passwordError && showValidation ? 'border-red-500 focus:border-red-500' : ''}`}
              />
            </div>
            {passwordError && showValidation && (
              <div className="flex items-center gap-1 -mt-1.5">
                <img src={ErrorIcon} alt="Error" className="h-4 w-4" />
                <p className="text-xs text-red-600">{passwordError}</p>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Footer Buttons */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-10 w-20 px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || email === '' || password === ''}
              className="h-10 w-20 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default UserFormDialog;
