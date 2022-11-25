const cloudinary = require('cloudinary');

cloudinary.config({ 
    cloud_name: 'dupbncewr', 
    api_key: '269958243189147', 
    api_secret: 'C5UUJnq3B9G0Sfi8poTWl1AgKCY' 
  });

  exports.uploads = (file, folder) => {
    return new Promise(resolve => {
      cloudinary.UploadStream.upload(file, (result) => {
        resolve({
          url:result.url,
          id: result.public_id
        })
      }, {
        resource_type:"auto",
        folder: folder
      })
    })
  }