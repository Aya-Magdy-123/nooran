import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import { login } from '../../services/authService'


const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();


  

  // const handleLogin = async (e) => {
  //   e.preventDefault();
  //   setLoading(true);
  //   setError("");

  //   try {
  //     const userCredential = await signInWithEmailAndPassword(auth, email, password);
  //     const user = userCredential.user;

  //     // جيب الـ token
  //     const token = await user.getIdToken();

  //     // جيب بيانات المستخدم من الباك عشان تعرف الـ role
  //     const res = await fetch(`http://localhost:5000/api/auth/me`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     const data = await res.json();

  //     // خزّن في localStorage
  //     localStorage.setItem("token", token);
  //     localStorage.setItem("role", data.role);
  //     localStorage.setItem("uid", user.uid);
  //     localStorage.setItem("name", data.name);

  //     // وجّه على حسب الـ role
  //     if (data.role === "admin") {
  //       navigate("/admin");
  //     } else if (data.role === "supervisor") {
  //       navigate("/supervisor");
  //     }
  //   } catch (err) {
  //   console.log(err.code, err.message);
  //     setError("الإيميل أو كلمة المرور غلط");
  //   } finally {
  //     setLoading(false);
  //   }
  // };
const handleLogin = async (e) => {
  e.preventDefault()
  try {
    setLoading(true)
    const userData = await login(email, password)

    // حفظ في localStorage
    localStorage.setItem("uid",  userData.uid)
    localStorage.setItem("role", userData.role)
    localStorage.setItem("name", userData.name)

    // توجيه حسب الدور
    if (userData.role === "admin")      navigate("/admin")
    if (userData.role === "supervisor") navigate("/supervisor")

  } catch (err) {
    setError("بيانات غلط أو المستخدم مش موجود")
  } finally {
    setLoading(false)
  }
}


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white px-6 py-4 rounded-xl shadow-md w-full max-w-md">
        <img src={logo} alt="Logo" className="mx-auto  h-32 " />
        <h2 className="text-2xl font-bold text-center mb-4">تسجيل الدخول</h2>

        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm mb-1"> البريد الإلكتروني </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg p-2 text-right"
              placeholder="example@gmail.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg p-2 text-right"
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;