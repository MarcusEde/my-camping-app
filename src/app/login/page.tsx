import { LoginForm } from './LoginForm';

export const metadata = { title: 'Logga in – Camp Concierge' };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-sm font-black text-white">
            CC
          </div>
          <h1 className="text-2xl font-black tracking-tight">Camp Concierge</h1>
          <p className="mt-1 text-sm text-gray-500">Logga in för att hantera din camping</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}