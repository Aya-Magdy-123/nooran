import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";

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

  const DUMMY_USERS = {
  "admin@zad.com": { password: "123456", role: "admin", name: "أدمن نوران", uid: "admin-001" },
  "supervisor@zad.com": { password: "123456", role: "supervisor", name: "مشرف نوران", uid: "sup-001" },
}

const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    const user = DUMMY_USERS[email];

    if (!user || user.password !== password) {
      setError("الإيميل أو كلمة المرور غلط");
      return;
    }

    localStorage.setItem("token", "dummy-token");
    localStorage.setItem("role", user.role);
    localStorage.setItem("uid", user.uid);
    localStorage.setItem("name", user.name);

    if (user.role === "admin") {
      navigate("/admin");
    } else if (user.role === "supervisor") {
      navigate("/supervisor");
    }
  } catch (err) {
    setError("حصل خطأ");
  } finally {
    setLoading(false);
  }
};
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