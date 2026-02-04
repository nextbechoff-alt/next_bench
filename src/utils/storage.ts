import { supabase } from "./supabase";

export const storage = {
    uploadMaterial: async (file: File, path: string) => {
        const { data, error } = await supabase.storage
            .from("materials")
            .upload(path, file, {
                cacheControl: "3600",
                upsert: false,
            });

        if (error) throw error;
        return data;
    },

    getPublicUrl: (path: string) => {
        const { data } = supabase.storage.from("materials").getPublicUrl(path);
        return data.publicUrl;
    },

    listMaterials: async (folderPath: string) => {
        const { data, error } = await supabase.storage
            .from("materials")
            .list(folderPath, {
                limit: 100,
                offset: 0,
                sortBy: { column: "name", order: "asc" },
            });

        if (error) throw error;
        return data;
    },

    deleteMaterial: async (path: string) => {
        const { data, error } = await supabase.storage.from("materials").remove([path]);
        if (error) throw error;
        return data;
    },
};
