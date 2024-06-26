import { Request, Response } from "express-serve-static-core";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import { IuserRegisterBody, IusersQuery, IuserLoginBody, IuserResponse, IauthResponse, IusersParams } from "../models/users";
import { deleteOneUser, getAllUsers,getOneUSer,getPwdUser,getTotalUser,registerUser,updateOneUser } from "../repositories/users";
import { Ipayload } from "../models/payload";
import { jwtOptions } from "../middleware/authorization";
import getLink from "../helper/getLink";


export const registerNewUser = async (req: Request<{}, {}, IuserRegisterBody>,res: Response<IuserResponse>) => {
  const { user_pass } = req.body;
  try {
    //password
    const salt = await bcrypt.genSalt();
    const hashed = await bcrypt.hash(user_pass, salt);
    
    // menyimpan kedalam db
    const result = await registerUser(req.body, hashed);
    return res.status(201).json({
      msg: "Success",
      data: result.rows,
    });

  } catch (err: unknown) {
    if (err instanceof Error) {
        console.log(err.message);
      }
      return res.status(500).json({
        msg: "Error",
        err: "Internal Server Error",
      });
    }
};

export const getDetailUser = async (req: Request<IusersParams>, res: Response<IuserResponse>) => {
  const { username } = req.params;
  try {
    const result = await getOneUSer(username);
    return res.status(200).json({
      msg: "Success",
      data: result.rows,
    });
  } catch (err) {
    if (err instanceof Error) {
      console.log(err.message);
    }
    return res.status(500).json({
      msg: "Error",
      err: "Internal Server Error",
    });
  }
};

export const getUsers = async (req: Request<{},{},{},IusersQuery>, res: Response<IuserResponse>) => {
  try{
      const result = await getAllUsers(req.query);
      // Mendapatkan total produk 
      const dataUser = await getTotalUser();
      // Mendapatkan nomor halaman saat ini
      const page = parseInt((req.query.page as string) || "1");
      // Mendapatkan total data produk dari hasil penghitungan
      const totalData = parseInt(dataUser.rows[0].total_user);
      // Menghitung total halaman berdasarkan total data dan batasan (limit) data per halaman
      const totalPage = Math.ceil( totalData/ (parseInt(req.query.limit || '2') )) ;
      console.log(req.baseUrl)
      // Membentuk objek respons dengan pesan sukses, data produk, dan meta-informasi
      const response = {
          msg: "success",
          data: result.rows,
          meta: {
              totalData,
              totalPage,
              page,
              prevLink: page > 1 ? getLink(req, "previous") : null,
              nextLink: page != totalPage ? getLink(req, "next") : null,
          }
      };

      // Mengirimkan respons JSON dengan status 200 OK ke klien
      return res.status(200).json(response);
  }catch (err: unknown) {
          if (err instanceof Error) {
              console.log(err.message);
            }
            return res.status(500).json({
              msg: "Error",
              err: "Internal Server Error",
            });
  }
}

export const updateUsers = async (req: Request ,res: Response<IuserResponse>) => {
    const { id } = req.params;
    const { user_pass } = req.body;
    try {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(user_pass, salt);
      const result = await updateOneUser(id, req.body, hashed);
      return res.status(200).json({
          msg: "success",
          data: result.rows,
      });
    }catch (err: unknown) {
        if (err instanceof Error) {
            console.log(err.message);
          }
          return res.status(500).json({
            msg: "Error",
            err: "Internal Server Error",
          });
        }  
};

export const deleteUser = async (req: Request, res: Response<IuserResponse>) => {
    const { id } = req.params;
    try{
        const result = await deleteOneUser(id);
        return res.status(200).json({
            msg: "succes",
            data: result.rows,
        });
    }catch (err: unknown) {
            if (err instanceof Error) {
                console.log(err.message);
              }
              return res.status(500).json({
                msg: "Error",
                err: "Internal Server Error",
              });
    }
};

export const loginUser = async (req: Request<{}, {}, IuserLoginBody>,res: Response<IauthResponse>) => {
    const { user_email ,user_pass } = req.body;
    try {
      // User login menggunakan username
      const result = await getPwdUser(user_email);
      // handling jika password tidak ditemukan
      if (!result.rows.length) throw new Error("Siswa tidak ditemukan");
      const { user_pass: hash, username } = result.rows[0];
      // mengecek apakah password sama
      const isPwdValid = await bcrypt.compare(user_pass, hash);
      // handling jika password salah
      if (!isPwdValid) throw new Error("Login gagal");
      // handling jika password benar
      const payload: Ipayload = {
        username: username
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET as string, jwtOptions);
      return res.status(200).json({
        msg: `Selamat datang, ${username}!`,
        data: [{ token }],
      });
    } catch (error) {
      if (error instanceof Error) {
        if (/(invalid(.)+id(.)+)/g.test(error.message)) {
          return res.status(401).json({
            msg: "Error",
            err: "Siswa tidak ditemukan",
          });
        }
        return res.status(401).json({
          msg: "Error",
          err: error.message,
        });
      }
      return res.status(500).json({
        msg: "Error",
        err: "Internal Server Error",
      });
    }
};
  