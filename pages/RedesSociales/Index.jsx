import React from 'react';

const RedesSociales = () => {
  return (
    <div className="content-wrapper">
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Gestión de Redes Sociales</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="content">
        <div className="container-fluid">
          <div className="row">
            {/* Panel de Instagram */}
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fab fa-instagram mr-2"></i>
                    Instagram
                  </h3>
                </div>
                <div className="card-body">
                  <div className="small-box bg-info">
                    <div className="inner">
                      <h3>5</h3>
                      <p>Comentarios pendientes</p>
                    </div>
                  </div>
                  {/* Aquí irían los comentarios pendientes */}
                </div>
              </div>
            </div>

            {/* Panel de Facebook */}
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fab fa-facebook mr-2"></i>
                    Facebook
                  </h3>
                </div>
                <div className="card-body">
                  <div className="small-box bg-primary">
                    <div className="inner">
                      <h3>3</h3>
                      <p>Mensajes sin responder</p>
                    </div>
                  </div>
                  {/* Aquí irían los mensajes pendientes */}
                </div>
              </div>
            </div>

            {/* Panel de WhatsApp */}
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fab fa-whatsapp mr-2"></i>
                    WhatsApp
                  </h3>
                </div>
                <div className="card-body">
                  <div className="small-box bg-success">
                    <div className="inner">
                      <h3>8</h3>
                      <p>Chats activos</p>
                    </div>
                  </div>
                  {/* Aquí iría la lista de chats */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RedesSociales; 