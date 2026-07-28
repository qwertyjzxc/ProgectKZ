import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm border">
        <h1 className="text-2xl font-bold text-center mb-6">Вход</h1>
        <LoginForm />
      </div>
    </div>
  );
}
